
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import type { Tax } from '@/types';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

const taxFormSchema = (t: Function) => z.object({
  name: z.string().min(1, { message: t('Common.formErrors.requiredField', {fieldName: t('AddTaxDialog.nameLabel')}) }),
  rate: z.coerce
    .number({ invalid_type_error: t('Common.formErrors.positiveNumber') })
    .min(0, { message: t('Common.formErrors.nonNegativeNumber') })
    .max(100, { message: "Rate cannot exceed 100%." }),
  description: z.string().optional(),
});

type TaxFormData = z.infer<ReturnType<typeof taxFormSchema>>;

interface EditTaxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tax: Tax | null;
  onSaveTax: (updatedTax: Tax) => void;
}

export default function EditTaxDialog({ open, onOpenChange, tax, onSaveTax }: EditTaxDialogProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const currentTaxFormSchema = taxFormSchema(t);

  const form = useForm<TaxFormData>({
    resolver: zodResolver(currentTaxFormSchema),
    defaultValues: {
      name: '',
      rate: 0,
      description: '',
    },
  });

  useEffect(() => {
    if (tax && open && !isLoadingTranslations) {
      form.reset({
        name: tax.name,
        rate: tax.rate * 100, 
        description: tax.description || '',
      });
    } else if (!open) {
      form.reset();
    }
  }, [tax, open, form, isLoadingTranslations, t]);

  useEffect(() => {
    if (!isLoadingTranslations && tax && open) {
      form.trigger();
    }
  }, [isLoadingTranslations, tax, open, form, t]);

  function onSubmit(values: TaxFormData) {
    if (!tax) return;
    onSaveTax({
      ...tax, 
      ...values,
      rate: values.rate / 100, 
    });
  }

  if (isLoadingTranslations && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px] flex flex-col items-center justify-center h-72">
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
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) form.reset();
    }}>
      <DialogContent className="sm:max-w-[480px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('EditTaxDialog.title')}</DialogTitle>
          <DialogDescription>{t('EditTaxDialog.description', { taxName: tax?.name || 'tax' })}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden">
            <ScrollArea className="flex-grow pr-6 -mr-6">
                <div className="space-y-4 py-4 pr-6">
                  <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('AddTaxDialog.nameLabel')}</FormLabel><FormControl><Input placeholder={t('AddTaxDialog.namePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="rate" render={({ field }) => (<FormItem><FormLabel>{t('AddTaxDialog.rateLabel')}</FormLabel><FormControl><Input type="number" placeholder={t('AddTaxDialog.ratePlaceholder')} {...field} step="0.01" /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>{t('AddTaxDialog.descriptionLabel')}</FormLabel><FormControl><Textarea placeholder={t('AddTaxDialog.descriptionPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
            </ScrollArea>
            <DialogFooter className="pt-4 mt-4 border-t shrink-0">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('AddTaxDialog.cancelButton')}</Button>
              </DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{t('EditTaxDialog.saveButton')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
