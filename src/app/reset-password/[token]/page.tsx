// This file was moved from src/app/[locale]/reset-password/[token]/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, useRouter } from 'next/navigation';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { translationRxService } from '@/services/translation.rx.service';

const resetPasswordSchema = (t: Function) => z.object({
  password: z.string().min(8, { message: t('ResetPasswordPage.passwordMinLengthError') }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: t('ResetPasswordPage.passwordsDoNotMatchError'),
  path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<ReturnType<typeof resetPasswordSchema>>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const { toast } = useToast();
  const { t, isLoading, currentLocale } = useRxTranslate();
  const schema = useMemo(() => resetPasswordSchema(t), [t]);

  useEffect(() => {
    translationRxService.initialize(currentLocale);
  }, [currentLocale]);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const { formState: { isSubmitting } } = form;

  async function onSubmit(values: ResetPasswordFormValues) {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: values.password }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || t('ResetPasswordPage.resetFailedError'));
      }
      toast({
        title: t('ResetPasswordPage.resetSuccessTitle'),
        description: t('ResetPasswordPage.resetSuccessDescription'),
      });
      router.push('/login');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">{t('ResetPasswordPage.title')}</CardTitle>
          <CardDescription>{t('ResetPasswordPage.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('ResetPasswordPage.newPasswordLabel')}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('ResetPasswordPage.confirmPasswordLabel')}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('ResetPasswordPage.submitButton')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
