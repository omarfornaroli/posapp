
'use client';

import { useEffect, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form'; 
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'; 
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ShoppingCart } from 'lucide-react';
import { useRealtimePOSSettings } from '@/hooks/useRealtimePOSSettings';
import { useRouter } from 'next/navigation';

const posSettingsFormSchema = (t: Function) => z.object({
  requireAuthForCartItemRemoval: z.boolean().default(true),
  dispatchAtSaleDefault: z.boolean().default(true),
  separateCartAndPayment: z.boolean().default(false),
});

type POSSettingsFormData = z.infer<ReturnType<typeof posSettingsFormSchema>>;

export default function POSBehaviorSettingsForm() {
  const currentLocale = useLocale();
  const { t, isLoading: isLoadingTranslations, initializeTranslations } = useRxTranslate();
  const router = useRouter();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const { toast } = useToast();
  const formSchema = posSettingsFormSchema(t);
  const { posSettings: initialSettings, isLoading: isLoadingSettings, refetch: refetchSettings } = useRealtimePOSSettings();

  const form = useForm<POSSettingsFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requireAuthForCartItemRemoval: true,
      dispatchAtSaleDefault: true,
      separateCartAndPayment: false,
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
      window.location.reload(); // Force a reload to update the sidebar
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
            <CardContent className="space-y-4">
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
