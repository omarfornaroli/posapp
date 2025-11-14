// This file was moved from src/app/[locale]/reset-password/[token]/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { getApiPath } from '@/lib/utils';

import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';

type Translations = typeof enMessages.ResetPasswordPage;

const getTranslations = (locale: string): Translations => {
  return locale.startsWith('es') ? esMessages.ResetPasswordPage : enMessages.ResetPasswordPage;
}

const resetPasswordSchema = (t: Translations) => z.object({
  password: z.string().min(8, { message: t.passwordMinLengthError }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: t.passwordsDoNotMatchError,
  path: ['confirmPassword'],
});

type ResetPasswordFormValues = z.infer<ReturnType<typeof resetPasswordSchema>>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const { toast } = useToast();
  
  const [translations, setTranslations] = useState<Translations>(getTranslations('en'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const locale = typeof window !== 'undefined' ? (localStorage.getItem('preferredLocale') || navigator.language) : 'en';
    setTranslations(getTranslations(locale));
    setIsLoading(false);
  }, []);

  const schema = useMemo(() => resetPasswordSchema(translations), [translations]);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const { formState: { isSubmitting } } = form;

  async function onSubmit(values: ResetPasswordFormValues) {
    try {
      const response = await fetch(getApiPath('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: values.password }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || translations.resetFailedError);
      }
      toast({
        title: translations.resetSuccessTitle,
        description: translations.resetSuccessDescription,
      });
      router.push(getApiPath('/login'));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error', // Fallback
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
          <CardTitle className="font-headline text-2xl">{translations.title}</CardTitle>
          <CardDescription>{translations.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>{translations.newPasswordLabel}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>{translations.confirmPasswordLabel}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {translations.submitButton}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}