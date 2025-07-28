
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Store } from 'lucide-react';
import ForgotPasswordDialog from '@/components/auth/ForgotPasswordDialog';
import { translationRxService } from '@/services/translation.rx.service';

const loginSchema = (t: (key: string) => string) => z.object({
  email: z.string().email({ message: t('Common.formErrors.invalidEmail') }),
  password: z.string().min(1, { message: t('Common.formErrors.requiredField', { fieldName: t('LoginPage.passwordLabel') }) }),
  rememberMe: z.boolean().default(false),
});

type LoginFormValues = z.infer<ReturnType<typeof loginSchema>>;

export default function LoginPage() {
  const t = useTranslations();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Initialize translations for the current locale
    const locale = translationRxService.getCurrentLocaleValue();
    translationRxService.initialize(locale);
  }, []);

  const schema = useMemo(() => loginSchema(t), [t]);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
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

      if (typeof window !== 'undefined') {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('loggedInUserEmail', values.email);
        localStorage.setItem('sessionExpiresAt', result.expiresAt);
        window.location.assign('/');
      }

    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('LoginPage.loginErrorTitle'),
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isClient) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Store className="h-8 w-8" />
            </div>
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
                      <Label htmlFor="email">{t('LoginPage.emailLabel')}</Label>
                      <Input id="email" type="email" placeholder={t('LoginPage.emailPlaceholder')} {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">{t('LoginPage.passwordLabel')}</Label>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-xs"
                          onClick={() => setIsForgotPasswordOpen(true)}
                        >
                          {t('LoginPage.forgotPassword')}
                        </Button>
                      </div>
                      <Input id="password" type="password" placeholder={t('LoginPage.passwordPlaceholder')} {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                        <label
                          htmlFor="rememberMe"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {t('LoginPage.rememberMeLabel')}
                        </label>
                      </div>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? t('LoginPage.loggingInButton') : t('LoginPage.loginButton')}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <ForgotPasswordDialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen} />
    </>
  );
}
