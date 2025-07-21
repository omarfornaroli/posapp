

'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { Currency } from '@/types';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

const currencyFormSchema = (t: Function, existingCodes: string[], currentCurrencyCode?: string) => z.object({
  name: z.string().min(2, { message: t('Common.formErrors.minLength', {fieldName: t('AddCurrencyDialog.nameLabel'), minLength: 2}) }),
  code: z.string().length(3, { message: t('AddCurrencyDialog.codeLengthError') }).regex(/^[A-Z]{3}$/, { message: t('AddCurrencyDialog.codeFormatError')})
    .refine(code => code === currentCurrencyCode || !existingCodes.includes(code.toUpperCase()), { message: t('AddCurrencyDialog.codeExistsError') }),
  symbol: z.string().min(1, { message: t('Common.formErrors.requiredField', {fieldName: t('AddCurrencyDialog.symbolLabel')}) }).max(5, { message: t('Common.formErrors.maxLength', {fieldName: t('AddCurrencyDialog.symbolLabel'), maxLength: 5}) }),
  decimalPlaces: z.coerce.number().int().min(0, {message: t('Common.formErrors.nonNegativeNumber')}).max(4, {message: t('AddCurrencyDialog.decimalPlacesMaxError')}),
  isEnabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  exchangeRate: z.coerce.number().positive({message: t('Common.formErrors.positiveNumber')}).optional().or(z.literal('')),
});

type CurrencyFormData = z.infer<ReturnType<typeof currencyFormSchema>>;

interface EditCurrencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: Currency | null;
  onSaveCurrency: (updatedCurrency: Currency) => void;
  existingCodes: string[];
}

export default function EditCurrencyDialog({ open, onOpenChange, currency, onSaveCurrency, existingCodes }: EditCurrencyDialogProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const currentSchema = currencyFormSchema(t, existingCodes, currency?.code);

  const form = useForm<CurrencyFormData>({
    resolver: zodResolver(currentSchema),
  });

  useEffect(() => {
    if (currency && open && !isLoadingTranslations) {
      form.reset({
        name: currency.name,
        code: currency.code,
        symbol: currency.symbol,
        decimalPlaces: currency.decimalPlaces,
        isEnabled: currency.isEnabled,
        isDefault: currency.isDefault || false,
        exchangeRate: currency.exchangeRate !== undefined ? currency.exchangeRate : '',
      });
    } else if (!open) {
      form.reset({ name: '', code: '', symbol: '', decimalPlaces: 2, isEnabled: true, isDefault: false, exchangeRate: ''});
    }
  }, [currency, open, form, isLoadingTranslations, t]);

  useEffect(() => {
    if (!isLoadingTranslations && currency && open) {
      form.trigger();
    }
  }, [isLoadingTranslations, currency, open, form, t]);

  function onSubmit(values: CurrencyFormData) {
    if (!currency) return;
    onSaveCurrency({
      ...currency, 
      ...values,
      code: values.code.toUpperCase(),
      exchangeRate: values.exchangeRate === '' ? undefined : Number(values.exchangeRate),
    });
  }

  if (isLoadingTranslations && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg flex flex-col items-center justify-center h-96">
          <DialogHeader className="sr-only"><DialogTitle>{t('Common.loadingTitle')}</DialogTitle></DialogHeader>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) form.reset(); }}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('EditCurrencyDialog.title')}</DialogTitle>
          <DialogDescription>{t('EditCurrencyDialog.description', { currencyName: currency?.name || 'currency' })}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden">
             <ScrollArea className="flex-grow pr-6 -mr-6">
                <div className="space-y-4 py-4 pr-6">
                  <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('AddCurrencyDialog.nameLabel')}</FormLabel><FormControl><Input placeholder={t('AddCurrencyDialog.namePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>{t('AddCurrencyDialog.codeLabel')}</FormLabel><FormControl><Input placeholder={t('AddCurrencyDialog.codePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="symbol" render={({ field }) => (<FormItem><FormLabel>{t('AddCurrencyDialog.symbolLabel')}</FormLabel><FormControl><Input placeholder={t('AddCurrencyDialog.symbolPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="decimalPlaces" render={({ field }) => (<FormItem><FormLabel>{t('AddCurrencyDialog.decimalPlacesLabel')}</FormLabel><FormControl><Input type="number" placeholder="2" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="exchangeRate" render={({ field }) => (<FormItem><FormLabel>{t('AddCurrencyDialog.exchangeRateLabel')}</FormLabel><FormControl><Input type="number" step="any" placeholder={t('AddCurrencyDialog.exchangeRatePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <div className="flex items-center space-x-4 pt-2">
                      <FormField control={form.control} name="isEnabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1"><FormLabel>{t('AddCurrencyDialog.enabledLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="isDefault" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1"><FormLabel>{t('AddCurrencyDialog.defaultLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                  </div>
                </div>
              </ScrollArea>
            <DialogFooter className="pt-4 mt-4 border-t shrink-0">
              <DialogClose asChild><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('AddCurrencyDialog.cancelButton')}</Button></DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{t('EditCurrencyDialog.saveButton')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
