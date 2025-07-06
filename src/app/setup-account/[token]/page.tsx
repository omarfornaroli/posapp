'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useParams } from 'next/navigation';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';

export default function SetupAccountPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const token = params.token as string;

  const setupAccountSchema = z.object({
    name: z.string().min(2, { message: t('Common.formErrors.minLength', {fieldName: t('AddUserDialog.nameLabel'), minLength: 2}) }),
    password: z.string().min(8, { message: t('AccountSetupPage.passwordMinLengthError') }),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('AccountSetupPage.passwordsDoNotMatchError'),
    path: ['confirmPassword'],
  });

  type SetupAccountFormValues = z.infer<typeof setupAccountSchema>;

  const form = useForm<SetupAccountFormValues>({
    resolver: zodResolver(setupAccountSchema),
    defaultValues: { name: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!isLoadingTranslations) {
      form.trigger(); 
    }
  }, [isLoadingTranslations, form, t]);

  async function onSubmit(data: SetupAccountFormValues) {
    setIsSubmitting(true);
    try {
        const response = await fetch('/api/users/setup-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token,
                name: data.name,
                password: data.password,
            }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || t('AccountSetupPage.setupFailedError'));
        }

        toast({
            title: t('AccountSetupPage.setupSuccessTitle'),
            description: t('AccountSetupPage.setupSuccessDescription'),
        });
        router.push('/login');

    } catch (error) {
        toast({
            variant: 'destructive',
            title: t('Common.error'),
            description: error instanceof Error ? error.message : t('AccountSetupPage.setupFailedError'),
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (isLoadingTranslations) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background py-12 px-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background py-12 px-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <CardTitle className="font-headline text-2xl">{t('AccountSetupPage.title')}</CardTitle>
          <CardDescription>{t('AccountSetupPage.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('AddUserDialog.nameLabel')}</FormLabel>
                    <FormControl><Input placeholder={t('AddUserDialog.namePlaceholder')} {...field} /></FormControl>
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
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('AccountSetupPage.confirmPasswordLabel')}</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('Common.savingButton')}
                  </>
                ) : (
                  t('AccountSetupPage.submitButton')
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
