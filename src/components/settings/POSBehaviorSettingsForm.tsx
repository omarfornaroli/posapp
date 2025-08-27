
'use client';

import { useEffect, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form'; 
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'; 
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ShoppingCart } from 'lucide-react';
import { useDexiePOSSettings } from '@/hooks/useDexiePOSSettings';

const posSettingsFormSchema = (t: Function) => z.object({
  requireAuthForCartItemRemoval: z.boolean().default(true),
  dispatchAtSaleDefault: z.boolean().default(true),
  separateCartAndPayment: z.boolean().default(false),
  sessionDuration: z.coerce.number().int().positive().default(30),
});

type POSSettingsFormData = z.infer<ReturnType<typeof posSettingsFormSchema>>;

const durationOptions = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 20, label: '20 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 180, label: '3 hours' },
  { value: 300, label: '5 hours' },
  { value: 480, label: '8 hours' },
  { value: 600, label: '10 hours' },
  { value: 720, label: '12 hours' },
];

export default function POSBehaviorSettingsForm() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const { toast } = useToast();
  const formSchema = posSettingsFormSchema(t);
  const { posSettings: initialSettings, isLoading: isLoadingSettings, refetch: refetchSettings } = useDexiePOSSettings();

  const form = useForm<POSSettingsFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requireAuthForCartItemRemoval: true,
      dispatchAtSaleDefault: true,
      separateCartAndPayment: false,
      sessionDuration: 30,
    },
  });

  useEffect(() => {
    if (initialSettings && !isLoadingSettings && !isLoadingTranslations) {
      form.reset(initialSettings as POSSettingsFormData);
    }
  }, [initialSettings, isLoadingSettings, isLoadingTranslations, form]);

  useEffect(() => {
    if (!isLoadingTranslations) {
      form.trigger(); 
    }
  }, [isLoadingTranslations, form, t]);

  async function onSubmit(values: POSSettingsFormData) {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        const userEmail = localStorage.getItem('loggedInUserEmail');
        if (userEmail) headers['X-User-Email'] = userEmail;
      }
      const response = await fetch('/api/pos-settings', {
        method: 'POST',
        headers,
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save POS settings');
      }
      refetchSettings();
      toast({
        title: t('Toasts.settingsSavedTitle'),
        description: t('POSBehaviorSettingsForm.saveSuccessDescription'),
      });
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : 'Error saving POS settings',
      });
    }
  }

  if (isLoadingTranslations || isLoadingSettings) {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center"><ShoppingCart className="mr-3 h-6 w-6 text-primary"/> ...</CardTitle>
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
                <CardTitle className="font-headline text-xl flex items-center"><ShoppingCart className="mr-3 h-6 w-6 text-primary"/>{t('POSBehaviorSettingsForm.title')}</CardTitle>
                <CardDescription>{t('POSBehaviorSettingsForm.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="sessionDuration" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('POSBehaviorSettingsForm.sessionDurationLabel')}</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value, 10))} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('POSBehaviorSettingsForm.sessionDurationPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {durationOptions.map(option => (
                          <SelectItem key={option.value} value={String(option.value)}>{t(`POSBehaviorSettingsForm.durationOptions.${option.label.replace(' ', '')}` as any, {}, {fallback: option.label})}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                     <FormDescription>{t('POSBehaviorSettingsForm.sessionDurationDescription')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="requireAuthForCartItemRemoval" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>{t('POSBehaviorSettingsForm.requireAuthForCartItemRemovalLabel')}</FormLabel><FormDescription>{t('POSBehaviorSettingsForm.requireAuthForCartItemRemovalDescription')}</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="dispatchAtSaleDefault" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>{t('POSBehaviorSettingsForm.dispatchAtSaleDefaultLabel')}</FormLabel><FormDescription>{t('POSBehaviorSettingsForm.dispatchAtSaleDefaultDescription')}</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="separateCartAndPayment" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>{t('POSBehaviorSettingsForm.separateCartAndPaymentLabel')}</FormLabel><FormDescription>{t('POSBehaviorSettingsForm.separateCartAndPaymentDescription')}</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {form.formState.isSubmitting ? t('Common.savingButton') : t('ReceiptSettingsForm.saveButton')}
              </Button>
            </CardFooter>
          </form>
        </FormProvider>
      </Card>
  );
}

    