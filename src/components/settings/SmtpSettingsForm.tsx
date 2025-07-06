
'use client';

import { useEffect, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useRealtimeSmtpSettings } from '@/hooks/useRealtimeSmtpSettings';

const smtpSettingsFormSchema = (t: Function) => z.object({
  host: z.string().min(1, { message: t('Common.formErrors.requiredField', {fieldName: t('SmtpSettingsForm.hostLabel')}) }),
  port: z.coerce.number().int().positive({ message: t('Common.formErrors.positiveNumber') }),
  user: z.string().min(1, { message: t('Common.formErrors.requiredField', {fieldName: t('SmtpSettingsForm.userLabel')}) }),
  pass: z.string().optional(), // Optional: user might not want to update it
  from: z.string().min(1, { message: t('Common.formErrors.requiredField', {fieldName: t('SmtpSettingsForm.fromLabel')}) }),
});

type SmtpSettingsFormData = z.infer<ReturnType<typeof smtpSettingsFormSchema>>;

export default function SmtpSettingsForm() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { toast } = useToast();
  const formSchema = smtpSettingsFormSchema(t);

  const { smtpSettings: initialSettings, isLoading: isLoadingSettings, refetch: refetchSettings } = useRealtimeSmtpSettings();

  const form = useForm<SmtpSettingsFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      host: '', port: 587, user: '', pass: '', from: '',
    },
  });

  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  useEffect(() => {
    if (initialSettings && !isLoadingSettings && !isLoadingTranslations) {
      form.reset({
        host: initialSettings.host || '',
        port: initialSettings.port || 587,
        user: initialSettings.user || '',
        pass: '', // Never populate password field from server
        from: initialSettings.from || '',
      });
    }
  }, [initialSettings, isLoadingSettings, isLoadingTranslations, form]);

  async function onSubmit(values: SmtpSettingsFormData) {
    const dataToSubmit: Partial<SmtpSettingsFormData> = { ...values };
    // Only include the password if the user actually typed something into the field
    if (!values.pass) {
      delete dataToSubmit.pass;
    }
    
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        const userEmail = localStorage.getItem('loggedInUserEmail');
        if (userEmail) headers['X-User-Email'] = userEmail;
      }

      const response = await fetch('/api/settings/smtp', {
        method: 'POST',
        headers,
        body: JSON.stringify(dataToSubmit),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save SMTP settings');
      }
      refetchSettings();
      toast({
        title: t('Toasts.settingsSavedTitle'),
        description: t('SmtpSettingsForm.saveSuccessDescription'),
      });
      form.reset({ ...form.getValues(), pass: '' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : 'Error saving SMTP settings',
      });
    }
  }

  const isConfigured = useMemo(() => initialSettings?.isConfigured, [initialSettings]);

  if (isLoadingTranslations || isLoadingSettings) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center"><Mail className="mr-3 h-6 w-6 text-primary"/> ...</CardTitle>
            </CardHeader>
            <CardContent>
                 <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <Mail className="mr-3 h-6 w-6 text-primary"/>
              {t('SmtpSettingsForm.title')}
            </CardTitle>
            <CardDescription>{t('SmtpSettingsForm.descriptionDb')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center gap-4 p-3 border rounded-lg">
                <span className="font-medium text-sm">{t('SmtpSettingsForm.statusLabel')}</span>
                {isConfigured === null ? (
                    <Loader2 className="h-4 w-4 animate-spin"/>
                ) : isConfigured ? (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {t('SmtpSettingsForm.statusConfigured')}
                    </Badge>
                ) : (
                    <Badge variant="destructive">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        {t('SmtpSettingsForm.statusNotConfigured')}
                    </Badge>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="host" render={({ field }) => (<FormItem><FormLabel>{t('SmtpSettingsForm.hostLabel')}</FormLabel><FormControl><Input placeholder={t('SmtpSettingsForm.hostPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="port" render={({ field }) => (<FormItem><FormLabel>{t('SmtpSettingsForm.portLabel')}</FormLabel><FormControl><Input type="number" placeholder="587" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="user" render={({ field }) => (<FormItem><FormLabel>{t('SmtpSettingsForm.userLabel')}</FormLabel><FormControl><Input placeholder={t('SmtpSettingsForm.userPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="pass" render={({ field }) => (<FormItem><FormLabel>{t('SmtpSettingsForm.passLabel')}</FormLabel><FormControl><Input type="password" placeholder={t('SmtpSettingsForm.passPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="from" render={({ field }) => (<FormItem><FormLabel>{t('SmtpSettingsForm.fromLabel')}</FormLabel><FormControl><Input placeholder={t('SmtpSettingsForm.fromPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />

          </CardContent>
          <CardFooter>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Save className="mr-2 h-4 w-4" />)}
              {form.formState.isSubmitting ? t('Common.savingButton') : t('ReceiptSettingsForm.saveButton')}
            </Button>
          </CardFooter>
        </form>
      </FormProvider>
    </Card>
  );
}
