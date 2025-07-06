
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import ForgotPasswordDialog from '@/components/auth/ForgotPasswordDialog';

export default function LoginPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);


  const loginFormSchema = useMemo(() => z.object({
    email: z.string().email({ message: t('Common.formErrors.invalidEmail') }),
    password: z.string().min(1, { message: t('Common.formErrors.requiredField', {fieldName: t('LoginPage.passwordLabel')}) }),
    rememberMe: z.boolean().default(false).optional(),
  }), [t]);

  type LoginFormValues = z.infer<typeof loginFormSchema>;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || t('LoginPage.loginErrorDescription'));
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('loggedInUserEmail', result.email);
        localStorage.setItem('sessionExpiresAt', result.expiresAt);
      }
      toast({
        title: t('LoginPage.loginSuccessTitle'),
        description: t('LoginPage.loginSuccessDescription'),
      });
      // Use a full page reload to ensure all states are reset correctly after login.
      window.location.assign(`/`); 

    } catch (error) {
       toast({
        variant: 'destructive',
        title: t('LoginPage.loginErrorTitle'),
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('loggedInUserEmail');
        localStorage.removeItem('sessionExpiresAt');
      }
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleForgotPassword = () => {
    setIsForgotPasswordOpen(true);
  };
  
  if (isLoadingTranslations) {
      return (
      <div className="flex flex-grow items-center justify-center py-12 px-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-grow items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="h-6 w-6" />
            </div>
            <CardTitle className="font-headline text-2xl">{t('LoginPage.title')}</CardTitle>
            <CardDescription>{t('LoginPage.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      <div className="flex justify-between items-center">
                        <FormLabel>{t('LoginPage.passwordLabel')}</FormLabel>
                        <Button variant="link" size="sm" type="button" className="h-auto p-0 font-normal" onClick={handleForgotPassword}>
                            {t('LoginPage.forgotPassword')}
                        </Button>
                      </div>
                      <FormControl>
                        <Input type="password" placeholder={t('LoginPage.passwordPlaceholder')} {...field} />
                      </FormControl>
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
                        <FormLabel>
                          {t('LoginPage.rememberMeLabel')}
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('LoginPage.loggingInButton')}
                    </>
                  ) : (
                    t('LoginPage.loginButton')
                  )}
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
