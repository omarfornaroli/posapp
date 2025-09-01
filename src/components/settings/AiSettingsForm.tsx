
'use client';

import { useEffect, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'; 
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BrainCircuit, Loader2, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useDexieAiSettings } from '@/hooks/useDexieAiSettings';

const aiSettingsFormSchema = (t: Function) => z.object({
  geminiApiKey: z.string().optional(),
});

type AiSettingsFormData = z.infer<ReturnType<typeof aiSettingsFormSchema>>;

export default function AiSettingsForm() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const { toast } = useToast();
  const formSchema = aiSettingsFormSchema(t);
  const { aiSettings: initialSettings, isLoading: isLoadingSettings, refetch: refetchSettings } = useDexieAiSettings();

  const form = useForm<AiSettingsFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      geminiApiKey: '',
    },
  });

  useEffect(() => {
    if (initialSettings && !isLoadingSettings && !isLoadingTranslations) {
      form.reset({
        geminiApiKey: '', // Never populate the key field from the server
      });
    }
  }, [initialSettings, isLoadingSettings, isLoadingTranslations, form]);

  async function onSubmit(values: AiSettingsFormData) {
    const dataToSubmit: Partial<AiSettingsFormData> = { ...values };
    if (!values.geminiApiKey) {
      delete dataToSubmit.geminiApiKey;
    }

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        const userEmail = localStorage.getItem('loggedInUserEmail');
        if (userEmail) headers['X-User-Email'] = userEmail;
      }

      const response = await fetch('/api/settings/ai', {
        method: 'POST',
        headers,
        body: JSON.stringify(dataToSubmit),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save AI settings');
      }
      refetchSettings();
      toast({
        title: t('Toasts.settingsSavedTitle'),
        description: t('AiSettingsForm.saveSuccessDescription'),
      });
      form.reset({ ...form.getValues(), geminiApiKey: '' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : 'Error saving AI settings',
      });
    }
  }
  
  const isKeySet = useMemo(() => initialSettings?.isKeySet, [initialSettings]);

  if (isLoadingTranslations || isLoadingSettings) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center"><BrainCircuit className="mr-3 h-6 w-6 text-primary"/> ...</CardTitle>
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
              <BrainCircuit className="mr-3 h-6 w-6 text-primary"/>
              {t('AiSettingsForm.title')}
            </CardTitle>
            <CardDescription>{t('AiSettingsForm.descriptionDb')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center gap-4 p-3 border rounded-lg">
                <span className="font-medium text-sm">{t('AiSettingsForm.statusLabel')}</span>
                {isKeySet === null ? (
                    <Loader2 className="h-4 w-4 animate-spin"/>
                ) : isKeySet ? (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {t('AiSettingsForm.statusConfigured')}
                    </Badge>
                ) : (
                     <Badge variant="destructive">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        {t('AiSettingsForm.statusNotConfigured')}
                    </Badge>
                )}
            </div>
            <FormField
              control={form.control}
              name="geminiApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('AiSettingsForm.apiKeyLabel')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('AiSettingsForm.apiKeyPlaceholder')} {...field} />
                  </FormControl>
                  <FormDescription>{t('AiSettingsForm.apiKeyDescription')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
