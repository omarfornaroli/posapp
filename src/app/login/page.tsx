// This file was moved from src/app/[locale]/login/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import ForgotPasswordDialog from '@/components/auth/ForgotPasswordDialog';

import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';

type Translations = typeof enMessages.LoginPage;
type CommonErrors = typeof enMessages.Common.formErrors;

const getLoginTranslations = (locale: string): { t: Translations; tErrors: CommonErrors } => {
  if (locale.startsWith('es')) {
    return { t: esMessages.LoginPage, tErrors: esMessages.Common.formErrors };
  }
  return { t: enMessages.LoginPage, tErrors: enMessages.Common.formErrors };
};


const loginSchema = (t: Translations, tErrors: CommonErrors) => z.object({
  email: z.string().email({ message: tErrors.invalidEmail }),
  password: z.string().min(1, { message: tErrors.requiredField.replace('{fieldName}', t.passwordLabel) }),
  rememberMe: z.boolean().default(false).optional(),
});

type LoginFormValues = z.infer<ReturnType<typeof loginSchema>>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [{ t, tErrors }, setTranslations] = useState(getLoginTranslations('en'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const locale = typeof window !== 'undefined' ? (localStorage.getItem('preferredLocale') || navigator.language) : 'en';
    setTranslations(getLoginTranslations(locale));
    setIsLoading(false);
  }, []);
  
  const schema = useMemo(() => loginSchema(t, tErrors), [t, tErrors]);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });
  
  const { formState: { isSubmitting } } = form;

  async function onSubmit(values: LoginFormValues) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || t.loginErrorDescription);
      }

      toast({
        title: t.loginSuccessTitle,
        description: t.loginSuccessDescription,
      });
      
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('loggedInUserEmail', values.email);
      localStorage.setItem('sessionExpiresAt', result.expiresAt);

      router.push('/');
      router.refresh();
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t.loginErrorTitle,
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (isLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">{t.title}</CardTitle>
            <CardDescription>{t.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.emailLabel}</FormLabel>
                      <FormControl>
                        <Input placeholder={t.emailPlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.passwordLabel}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={t.passwordPlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center justify-between">
                    <FormField
                    control={form.control}
                    name="rememberMe"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                            <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer">
                            {t.rememberMeLabel}
                            </FormLabel>
                        </div>
                        </FormItem>
                    )}
                    />
                    <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-sm"
                        onClick={() => setIsForgotPasswordOpen(true)}
                    >
                        {t.forgotPassword}
                    </Button>
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? t.loggingInButton : t.loginButton}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <ForgotPasswordDialog 
        open={isForgotPasswordOpen}
        onOpenChange={setIsForgotPasswordOpen}
      />
    </>
  );
}
