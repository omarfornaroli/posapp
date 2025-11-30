
// This file was moved from src/app/[locale]/setup-account/[token]/page.tsx
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

type Translations = {
  AccountSetupPage: typeof enMessages.AccountSetupPage;
  Common: typeof enMessages.Common;
  AddUserDialog: typeof enMessages.AddUserDialog;
  LoginPage: typeof enMessages.LoginPage;
};

const getTranslations = (locale: string): Translations => {
  if (locale.startsWith('es')) {
    return {
      AccountSetupPage: esMessages.AccountSetupPage,
      Common: esMessages.Common,
      AddUserDialog: esMessages.AddUserDialog,
      LoginPage: esMessages.LoginPage,
    };
  }
  return {
    AccountSetupPage: enMessages.AccountSetupPage,
    Common: enMessages.Common,
    AddUserDialog: enMessages.AddUserDialog,
    LoginPage: enMessages.LoginPage,
  };
};

const setupSchema = (t: Translations) => z.object({
  name: z.string().min(2, { message: t.Common.formErrors.minLength.replace('{fieldName}', t.AddUserDialog.nameLabel).replace('{minLength}', '2') }),
  password: z.string().min(8, { message: t.AccountSetupPage.passwordMinLengthError }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: t.AccountSetupPage.passwordsDoNotMatchError,
  path: ['confirmPassword'],
});

type SetupFormValues = z.infer<ReturnType<typeof setupSchema>>;

export default function SetupAccountPage() {
  const router = useRouter();
  const params = useParams();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const { toast } = useToast();
  const [translations, setTranslations] = useState<Translations>(getTranslations('en'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const rawLocale = typeof window !== 'undefined' ? (localStorage.getItem('preferredLocale') || navigator.language) : 'en';
    const locale = rawLocale.split('-')[0];
    setTranslations(getTranslations(locale));
    setIsLoading(false);
  }, []);

  const schema = useMemo(() => setupSchema(translations), [translations]);
  
  const form = useForm<SetupFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', password: '', confirmPassword: '' },
  });

  const { formState: { isSubmitting } } = form;

  async function onSubmit(values: SetupFormValues) {
    try {
      const response = await fetch(getApiPath('/api/users/setup-account'), {
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
        throw new Error(result.error || translations.AccountSetupPage.setupFailedError);
      }
      toast({
        title: translations.AccountSetupPage.setupSuccessTitle,
        description: translations.AccountSetupPage.setupSuccessDescription,
      });
      router.push(getApiPath('/login'));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: translations.Common.error,
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
          <CardTitle className="font-headline text-2xl">{translations.AccountSetupPage.title}</CardTitle>
          <CardDescription>{translations.AccountSetupPage.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{translations.AddUserDialog.nameLabel}</FormLabel>
                  <FormControl><Input placeholder={translations.AddUserDialog.namePlaceholder} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>{translations.LoginPage.passwordLabel}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel>{translations.AccountSetupPage.confirmPasswordLabel}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {translations.AccountSetupPage.submitButton}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
