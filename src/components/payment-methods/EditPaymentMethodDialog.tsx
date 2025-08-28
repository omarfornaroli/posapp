

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
import { Switch } from '@/components/ui/switch';
import type { PaymentMethod } from '@/types';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import MultiLanguageInput from '../shared/MultiLanguageInput';

const paymentMethodFormSchema = (t: Function, defaultLocale: string) => z.object({
  name: z.record(z.string()).refine(val => val[defaultLocale] && val[defaultLocale].trim() !== '', {
    message: t('Common.formErrors.requiredField', {fieldName: t('AddPaymentMethodDialog.nameLabel')}),
    path: [defaultLocale],
  }),
  description: z.record(z.string()).optional(),
  isEnabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

type PaymentMethodFormData = z.infer<ReturnType<typeof paymentMethodFormSchema>>;

interface EditPaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethod: PaymentMethod | null;
  onSavePaymentMethod: (updatedMethod: PaymentMethod) => void;
}

export default function EditPaymentMethodDialog({ open, onOpenChange, paymentMethod, onSavePaymentMethod }: EditPaymentMethodDialogProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const form = useForm<PaymentMethodFormData>({
    resolver: zodResolver(paymentMethodFormSchema(t, currentLocale)),
    defaultValues: {
      name: {},
      description: {},
      isEnabled: true,
      isDefault: false,
    },
  });

  useEffect(() => {
    if (paymentMethod && open && !isLoadingTranslations) {
      form.reset({
        name: paymentMethod.name || {},
        description: paymentMethod.description || {},
        isEnabled: paymentMethod.isEnabled,
        isDefault: paymentMethod.isDefault || false,
      });
    } else if (!open) {
      form.reset();
    }
  }, [paymentMethod, open, form, isLoadingTranslations, t]);

  useEffect(() => {
    if (!isLoadingTranslations && paymentMethod && open) {
      form.trigger();
    }
  }, [isLoadingTranslations, paymentMethod, open, form, t]);


  function onSubmit(values: PaymentMethodFormData) {
    if (!paymentMethod) return;
    
    // Ensure name and description are Maps before saving
    const nameAsMap = values.name instanceof Map ? values.name : new Map(Object.entries(values.name));
    const descriptionAsMap = values.description && Object.keys(values.description).length > 0
        ? (values.description instanceof Map ? values.description : new Map(Object.entries(values.description)))
        : new Map();

    onSavePaymentMethod({
      ...paymentMethod, 
      ...values,
      name: nameAsMap,
      description: descriptionAsMap,
    } as any);
  }

  if (isLoadingTranslations && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg flex flex-col items-center justify-center h-72">
          <DialogHeader className="sr-only">
            <DialogTitle>{t('Common.loadingTitle')}</DialogTitle>
            <DialogDescription>{t('Common.loadingDescription')}</DialogDescription>
          </DialogHeader>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) form.reset(); }}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('EditPaymentMethodDialog.title')}</DialogTitle>
          <DialogDescription>{t('EditPaymentMethodDialog.description', { methodName: paymentMethod?.name[currentLocale] || paymentMethod?.name['en'] || 'method' })}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden">
            <ScrollArea className="flex-grow pr-6 -mr-6">
                <div className="space-y-4 py-4 pr-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <MultiLanguageInput
                          value={field.value}
                          onChange={field.onChange}
                          label={t('AddPaymentMethodDialog.nameLabel')}
                          placeholder={t('AddPaymentMethodDialog.namePlaceholder')}
                          fieldId="name"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                         <MultiLanguageInput
                          value={field.value || {}}
                          onChange={field.onChange}
                          label={t('AddPaymentMethodDialog.descriptionLabel')}
                          placeholder={t('AddPaymentMethodDialog.descriptionPlaceholder')}
                          fieldId="description"
                          isTextarea={true}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center justify-between space-x-4">
                      <FormField control={form.control} name="isEnabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1"><div className="space-y-0.5"><FormLabel>{t('AddPaymentMethodDialog.enabledLabel')}</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                      <FormField control={form.control} name="isDefault" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1"><div className="space-y-0.5"><FormLabel>{t('AddPaymentMethodDialog.defaultLabel')}</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                  </div>
                </div>
            </ScrollArea>
            <DialogFooter className="pt-4 mt-auto shrink-0 border-t">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('AddPaymentMethodDialog.cancelButton')}</Button>
              </DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{t('EditPaymentMethodDialog.saveButton')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
