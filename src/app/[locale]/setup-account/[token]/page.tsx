'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, useRouter } from 'next/navigation';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { translationRxService } from '@/services/translation.rx.service';

const setupSchema = (t: Function) => z.object({
  name: z.string().min(2, { message: t('Common.formErrors.minLength', {fieldName: 'Name', minLength: 2}) }),
  password: z.string().min(8, { message: t('AccountSetupPage.passwordMinLengthError') }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: t('AccountSetupPage.passwordsDoNotMatchError'),
  path: ['confirmPassword'],
});

type SetupFormValues = z.infer<ReturnType<typeof setupSchema>>;

export default function SetupAccountPage() {
  const router = useRouter();
  const params = useParams();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const { toast } = useToast();
  const { t, isLoading, currentLocale } = useRxTranslate();
  const schema = useMemo(() => setupSchema(t), [t]);
  
  useEffect(() => {
    translationRxService.initialize(currentLocale);
  }, [currentLocale]);

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', password: '', confirmPassword: '' },
  });

  const { formState: { isSubmitting } } = form;

  async function onSubmit(values: SetupFormValues) {
    try {
      const response = await fetch('/api/users/setup-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: values.name,
          password: values.password,
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
          <CardTitle className="font-headline text-2xl">{t('AccountSetupPage.title')}</CardTitle>
          <CardDescription>{t('AccountSetupPage.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('AddUserDialog.nameLabel')}</FormLabel>
                  <FormControl><Input placeholder={t('AddUserDialog.namePlaceholder')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('LoginPage.passwordLabel')}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('AccountSetupPage.confirmPasswordLabel')}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('AccountSetupPage.submitButton')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}