

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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import type { ReceiptSetting, ReceiptMargin } from '@/types';
import { Loader2, Save, Eye, ReceiptText } from 'lucide-react';
import Image from 'next/image';
import ReceiptView from '@/components/receipt/ReceiptView';
import { mockPreviewTransaction } from '@/lib/mock-data';
import { useDexieReceiptSettings } from '@/hooks/useDexieReceiptSettings';

const receiptWidthOptions = ['auto', '80mm', '58mm'] as const;
const receiptMarginOptions: readonly [ReceiptMargin, ...ReceiptMargin[]] = ['none', 'small', 'medium', 'large'];

const receiptSettingsFormSchema = (t: Function) => z.object({
  logoUrl: z.string().url({ message: t('Common.formErrors.invalidUrl', {fieldName: t('ReceiptSettingsForm.logoUrlLabel')}) }).optional().or(z.literal('')),
  footerText: z.string().max(200, { message: t('Common.formErrors.maxLength', {fieldName: t('ReceiptSettingsForm.footerTextLabel'), maxLength: 200}) }).optional(),
  companyName: z.string().max(100, { message: t('Common.formErrors.maxLength', {fieldName: t('ReceiptSettingsForm.companyNameLabel'), maxLength: 100}) }).optional(),
  companyAddress: z.string().max(200, { message: t('Common.formErrors.maxLength', {fieldName: t('ReceiptSettingsForm.companyAddressLabel'), maxLength: 200}) }).optional(),
  companyPhone: z.string().max(50, { message: t('Common.formErrors.maxLength', {fieldName: t('ReceiptSettingsForm.companyPhoneLabel'), maxLength: 50}) }).optional(),
  receiptWidth: z.enum(receiptWidthOptions).default('auto'),
  receiptMargin: z.enum(receiptMarginOptions).default('small'),
  showCompanyName: z.boolean().default(true),
  showCompanyAddress: z.boolean().default(true),
  showCompanyPhone: z.boolean().default(true),
  showClientInfo: z.boolean().default(true),
  showItemBarcodes: z.boolean().default(false),
  showDiscountSummary: z.boolean().default(true), 
  showPromotionsApplied: z.boolean().default(true),
  showPaymentMethodsDetails: z.boolean().default(true),
});

type ReceiptSettingsFormData = z.infer<ReturnType<typeof receiptSettingsFormSchema>>;

export default function ReceiptSettingsForm() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const { toast } = useToast();
  const formSchema = receiptSettingsFormSchema(t);

  const { receiptSettings: initialSettings, isLoading: isLoadingSettings, refetch: refetchSettings } = useDexieReceiptSettings();

  const form = useForm<ReceiptSettingsFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { // Set basic defaults, will be overridden by fetched data
      logoUrl: '', footerText: '', companyName: '', companyAddress: '', companyPhone: '',
      receiptWidth: 'auto', receiptMargin: 'small', showCompanyName: true, showCompanyAddress: true,
      showCompanyPhone: true, showClientInfo: true, showItemBarcodes: false,
      showDiscountSummary: true, showPromotionsApplied: true, showPaymentMethodsDetails: true,
    },
  });

  useEffect(() => {
    if (initialSettings && !isLoadingSettings && !isLoadingTranslations) {
      form.reset(initialSettings as ReceiptSettingsFormData);
    }
  }, [initialSettings, isLoadingSettings, isLoadingTranslations, form]);

  useEffect(() => {
    if (!isLoadingTranslations) {
      form.trigger(); 
    }
  }, [isLoadingTranslations, form, t]);

  async function onSubmit(values: ReceiptSettingsFormData) {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        const userEmail = localStorage.getItem('loggedInUserEmail');
        if (userEmail) headers['X-User-Email'] = userEmail;
      }
      const response = await fetch('/api/receipt-settings', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save receipt settings');
      }
      refetchSettings(); // Refetch after saving
      toast({
        title: t('Toasts.settingsSavedTitle'),
        description: t('ReceiptSettingsForm.saveSuccessDescription'),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('ReceiptSettingsForm.errorSavingSettings'),
      });
    }
  }

  const watchedSettings = form.watch();
  const previewSettings: ReceiptSetting = useMemo(() => ({
    id: 'preview-settings',
    key: 'preview-key', 
    ...watchedSettings
  }), [watchedSettings]);
  
  const logoUrlValue = watchedSettings.logoUrl;

  const getPreviewWidthClass = (widthSetting?: '80mm' | '58mm' | 'auto') => {
    switch (widthSetting) {
      case '80mm': return 'w-[302px]'; 
      case '58mm': return 'w-[219px]'; 
      case 'auto':
      default:
        return 'max-w-md w-full'; 
    }
  };

  if (isLoadingTranslations || isLoadingSettings) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg lg:col-span-2 flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,64px)-10rem)]">
           <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </Card>
         <Card className="shadow-lg lg:col-span-1 lg:sticky lg:top-[calc(var(--header-height,64px)+1.5rem)] max-h-[calc(100vh-var(--header-height,64px)-3rem)] flex flex-col items-center justify-center">
           <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </Card>
      </div>
    );
  }


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="shadow-lg lg:col-span-2 flex flex-col max-h-[calc(100vh-var(--header-height,64px)-6rem)]">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center"><ReceiptText className="mr-3 h-6 w-6 text-primary"/>{t('ReceiptSettingsForm.title')}</CardTitle>
          <CardDescription>{t('ReceiptSettingsForm.description')}</CardDescription>
        </CardHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow min-h-0">
            <ScrollArea className="flex-grow min-h-0"> 
              <CardContent className="space-y-6 p-6">
                
                <h3 className="text-lg font-semibold text-primary border-b pb-1 mb-3">{t('ReceiptSettingsForm.generalSettingsTitle')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="receiptWidth" render={({ field }) => (<FormItem><FormLabel>{t('ReceiptSettingsForm.receiptWidthLabel')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('ReceiptSettingsForm.receiptWidthPlaceholder')} /></SelectTrigger></FormControl><SelectContent><SelectItem value="auto">{t('ReceiptSettingsForm.receiptWidthAuto')}</SelectItem><SelectItem value="80mm">{t('ReceiptSettingsForm.receiptWidth80mm')}</SelectItem><SelectItem value="58mm">{t('ReceiptSettingsForm.receiptWidth58mm')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="receiptMargin" render={({ field }) => (<FormItem><FormLabel>{t('ReceiptSettingsForm.receiptMarginLabel')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('ReceiptSettingsForm.receiptMarginPlaceholder')} /></SelectTrigger></FormControl><SelectContent>{receiptMarginOptions.map(option => (<SelectItem key={option} value={option}>{t(`ReceiptSettingsForm.receiptMargin${option.charAt(0).toUpperCase() + option.slice(1)}` as any)}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="logoUrl" render={({ field }) => (<FormItem><FormLabel>{t('ReceiptSettingsForm.logoUrlLabel')}</FormLabel><FormControl><Input placeholder={t('ReceiptSettingsForm.logoUrlPlaceholder')} {...field} /></FormControl><FormMessage />{logoUrlValue && (<div className="mt-2 p-2 border rounded-md bg-muted aspect-[3/1] max-w-[200px] flex items-center justify-center overflow-hidden"><Image src={logoUrlValue} alt={t('ReceiptSettingsForm.logoPreviewAlt')} width={150} height={50} className="object-contain max-h-full max-w-full" data-ai-hint="company logo" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block'; }}/></div>)}</FormItem>)} />
                <FormField control={form.control} name="footerText" render={({ field }) => (<FormItem><FormLabel>{t('ReceiptSettingsForm.footerTextLabel')}</FormLabel><FormControl><Textarea placeholder={t('ReceiptSettingsForm.footerTextPlaceholder')} {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />

                <h3 className="text-lg font-semibold text-primary border-b pb-1 mb-3 mt-6">{t('ReceiptSettingsForm.companyInfoTitle')}</h3>
                <FormField control={form.control} name="companyName" render={({ field }) => (<FormItem><FormLabel>{t('ReceiptSettingsForm.companyNameLabel')}</FormLabel><FormControl><Input placeholder={t('ReceiptSettingsForm.companyNamePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="companyAddress" render={({ field }) => (<FormItem><FormLabel>{t('ReceiptSettingsForm.companyAddressLabel')}</FormLabel><FormControl><Textarea placeholder={t('ReceiptSettingsForm.companyAddressPlaceholder')} {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="companyPhone" render={({ field }) => (<FormItem><FormLabel>{t('ReceiptSettingsForm.companyPhoneLabel')}</FormLabel><FormControl><Input placeholder={t('ReceiptSettingsForm.companyPhonePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                
                <h3 className="text-lg font-semibold text-primary border-b pb-1 mb-3 mt-6">{t('ReceiptSettingsForm.sectionVisibilityTitle')}</h3>
                <div className="space-y-3">
                  <FormField control={form.control} name="showCompanyName" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>{t('ReceiptSettingsForm.showCompanyNameLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="showCompanyAddress" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>{t('ReceiptSettingsForm.showCompanyAddressLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="showCompanyPhone" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>{t('ReceiptSettingsForm.showCompanyPhoneLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="showClientInfo" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>{t('ReceiptSettingsForm.showClientInfoLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="showItemBarcodes" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>{t('ReceiptSettingsForm.showItemBarcodesLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="showDiscountSummary" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>{t('ReceiptSettingsForm.showDiscountSummaryLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="showPromotionsApplied" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>{t('ReceiptSettingsForm.showPromotionsAppliedLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="showPaymentMethodsDetails" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>{t('ReceiptSettingsForm.showPaymentMethodsDetailsLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                </div>
              </CardContent>
            </ScrollArea>
            <CardFooter className="pt-6 border-t shrink-0">
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

      <Card className="shadow-lg lg:col-span-1 lg:sticky lg:top-[calc(var(--header-height,64px)+1.5rem)] max-h-[calc(100vh-var(--header-height,64px)-3rem)] flex flex-col">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center"><Eye className="mr-2 h-5 w-5 text-primary"/>{t('ReceiptSettingsForm.receiptPreviewTitle')}</CardTitle>
          <CardDescription>{t('ReceiptSettingsForm.receiptPreviewDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-auto p-2 sm:p-4">
          <ScrollArea className="h-full w-full border rounded-md bg-muted/30 p-2">
            <div className={`mx-auto ${getPreviewWidthClass(previewSettings.receiptWidth)}`}> 
                <ReceiptView transaction={mockPreviewTransaction} settings={previewSettings} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
