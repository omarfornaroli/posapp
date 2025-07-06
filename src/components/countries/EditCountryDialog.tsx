
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
import type { Country } from '@/types';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

const countryFormSchema = (t: Function, existingCodes: string[], currentCountryCodeAlpha2?: string) => z.object({
  name: z.string().min(2, { message: t('Common.formErrors.minLength', {fieldName: t('AddCountryDialog.nameLabel'), minLength: 2}) }),
  codeAlpha2: z.string().length(2, { message: t('AddCountryDialog.codeAlpha2LengthError') }).regex(/^[A-Z]{2}$/, { message: t('AddCountryDialog.codeAlpha2FormatError')})
    .refine(code => code === currentCountryCodeAlpha2 || !existingCodes.includes(code.toUpperCase()), { message: t('AddCountryDialog.codeExistsError') }),
  codeAlpha3: z.string().length(3, { message: t('AddCountryDialog.codeAlpha3LengthError') }).regex(/^[A-Z]{3}$/, { message: t('AddCountryDialog.codeAlpha3FormatError')}),
  numericCode: z.string().regex(/^\d{3}$/, { message: t('AddCountryDialog.numericCodeFormatError')}).optional().or(z.literal('')),
  currencyCode: z.string().length(3, { message: t('AddCountryDialog.currencyCodeLengthError') }).regex(/^[A-Z]{3}$/, { message: t('AddCountryDialog.currencyCodeFormatError')}).optional().or(z.literal('')),
  flagImageUrl: z.string().url({ message: t('Common.formErrors.invalidUrl')}).optional().or(z.literal('')),
  isEnabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

type CountryFormData = z.infer<ReturnType<typeof countryFormSchema>>;

interface EditCountryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country: Country | null;
  onSaveCountry: (updatedCountry: Country) => void;
  existingCodes: string[]; // Codes of other countries for validation
}

export default function EditCountryDialog({ open, onOpenChange, country, onSaveCountry, existingCodes }: EditCountryDialogProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const currentSchema = countryFormSchema(t, existingCodes, country?.codeAlpha2);

  const form = useForm<CountryFormData>({
    resolver: zodResolver(currentSchema),
  });

  useEffect(() => {
    if (country && open && !isLoadingTranslations) {
      form.reset({
        name: country.name,
        codeAlpha2: country.codeAlpha2,
        codeAlpha3: country.codeAlpha3,
        numericCode: country.numericCode || '',
        currencyCode: country.currencyCode || '',
        flagImageUrl: country.flagImageUrl || '',
        isEnabled: country.isEnabled,
        isDefault: country.isDefault || false,
      });
    } else if (!open) {
      form.reset({name: '', codeAlpha2: '', codeAlpha3: '', numericCode: '', currencyCode: '', flagImageUrl: '', isEnabled: true, isDefault: false});
    }
  }, [country, open, form, isLoadingTranslations, t]);

  useEffect(() => {
    if (!isLoadingTranslations && country && open) {
      form.trigger();
    }
  }, [isLoadingTranslations, country, open, form, t]);


  function onSubmit(values: CountryFormData) {
    if (!country) return;
    onSaveCountry({
      ...country, 
      ...values,
      codeAlpha2: values.codeAlpha2.toUpperCase(),
      codeAlpha3: values.codeAlpha3.toUpperCase(),
      currencyCode: values.currencyCode?.toUpperCase(),
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
          <DialogTitle className="font-headline">{t('EditCountryDialog.title')}</DialogTitle>
          <DialogDescription>{t('EditCountryDialog.description', { countryName: country?.name || 'country' })}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden">
             <ScrollArea className="flex-grow pr-6 -mr-6">
                <div className="space-y-4 py-4 pr-6">
                  <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('AddCountryDialog.nameLabel')}</FormLabel><FormControl><Input placeholder={t('AddCountryDialog.namePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="codeAlpha2" render={({ field }) => (<FormItem><FormLabel>{t('AddCountryDialog.codeAlpha2Label')}</FormLabel><FormControl><Input placeholder={t('AddCountryDialog.codeAlpha2Placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="codeAlpha3" render={({ field }) => (<FormItem><FormLabel>{t('AddCountryDialog.codeAlpha3Label')}</FormLabel><FormControl><Input placeholder={t('AddCountryDialog.codeAlpha3Placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="numericCode" render={({ field }) => (<FormItem><FormLabel>{t('AddCountryDialog.numericCodeLabel')}</FormLabel><FormControl><Input placeholder={t('AddCountryDialog.numericCodePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="currencyCode" render={({ field }) => (<FormItem><FormLabel>{t('AddCountryDialog.currencyCodeLabel')}</FormLabel><FormControl><Input placeholder={t('AddCountryDialog.currencyCodePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <FormField control={form.control} name="flagImageUrl" render={({ field }) => (<FormItem><FormLabel>{t('AddCountryDialog.flagImageUrlLabel')}</FormLabel><FormControl><Input placeholder={t('AddCountryDialog.flagImageUrlPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="flex items-center space-x-4 pt-2">
                      <FormField control={form.control} name="isEnabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1"><FormLabel>{t('AddCountryDialog.enabledLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="isDefault" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1"><FormLabel>{t('AddCountryDialog.defaultLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                  </div>
                </div>
              </ScrollArea>
            <DialogFooter className="pt-4 mt-4 border-t shrink-0">
              <DialogClose asChild><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('AddCountryDialog.cancelButton')}</Button></DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{t('EditCountryDialog.saveButton')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
