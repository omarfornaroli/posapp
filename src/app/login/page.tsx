// This file was moved from src/app/[locale]/login/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { translationRxService } from '@/services/translation.rx.service';
import ForgotPasswordDialog from '@/components/auth/ForgotPasswordDialog';


const loginSchema = (t: Function) => z.object({
  email: z.string().email({ message: t('Common.formErrors.invalidEmail') }),
  password: z.string().min(1, { message: t('Common.formErrors.requiredField', {fieldName: t('LoginPage.passwordLabel')}) }),
  rememberMe: z.boolean().default(false).optional(),
});

type LoginFormValues = z.infer<ReturnType<typeof loginSchema>>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, isLoading, currentLocale } = useRxTranslate();
  const schema = useMemo(() => loginSchema(t), [t]);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  useEffect(() => {
    translationRxService.initialize(currentLocale);
  }, [currentLocale]);


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
        throw new Error(result.error || t('LoginPage.loginErrorDescription'));
      }

      toast({
        title: t('LoginPage.loginSuccessTitle'),
        description: t('LoginPage.loginSuccessDescription'),
      });
      
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('loggedInUserEmail', values.email);
      localStorage.setItem('sessionExpiresAt', result.expiresAt);

      router.push('/');
      router.refresh();
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('LoginPage.loginErrorTitle'),
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
            <CardTitle className="font-headline text-2xl">{t('LoginPage.title')}</CardTitle>
            <CardDescription>{t('LoginPage.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('LoginPage.emailLabel')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('LoginPage.emailPlaceholder')} {...field} />
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
                      <FormLabel>{t('LoginPage.passwordLabel')}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={t('LoginPage.passwordPlaceholder')} {...field} />
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
                            {t('LoginPage.rememberMeLabel')}
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
                        {t('LoginPage.forgotPassword')}
                    </Button>
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? t('LoginPage.loggingInButton') : t('LoginPage.loginButton')}
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
