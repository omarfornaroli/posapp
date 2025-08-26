
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { Supplier } from '@/types';
import { Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import UpdateCostsFromFile from './UpdateCostsFromFile';
import { ScrollArea } from '@/components/ui/scroll-area';

const supplierFormSchema = (t: Function) => z.object({
  name: z.string().min(2, { message: t('Common.formErrors.minLength', {fieldName: t('AddSupplierDialog.nameLabel'), minLength: 2}) }),
  contactPerson: z.string().optional(),
  email: z.string().email({ message: t('Common.formErrors.invalidEmail') }).optional().or(z.literal('')), 
  phone: z.string().optional(), 
  address: z.string().optional(),
  website: z.string().url({ message: t('Common.formErrors.invalidUrl') }).optional().or(z.literal('')),
  notes: z.string().optional(),
  isEnabled: z.boolean().default(true),
});

type SupplierFormData = z.infer<ReturnType<typeof supplierFormSchema>>;

interface EditSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  onSaveSupplier: (updatedSupplier: Supplier) => void;
}

export default function EditSupplierDialog({ open, onOpenChange, supplier, onSaveSupplier }: EditSupplierDialogProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema(t)),
  });

  useEffect(() => {
    if (supplier && open && !isLoadingTranslations) {
      form.reset({
        name: supplier.name,
        contactPerson: supplier.contactPerson || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        website: supplier.website || '',
        notes: supplier.notes || '',
        isEnabled: supplier.isEnabled,
      });
    } else if (!open) {
      form.reset();
    }
  }, [supplier, open, form, isLoadingTranslations]);

  useEffect(() => {
    if (!isLoadingTranslations && supplier && open) {
      form.trigger();
    }
  }, [isLoadingTranslations, supplier, open, form, t]);

  function onSubmit(values: SupplierFormData) {
    if (!supplier) return;
    onSaveSupplier({
      ...supplier, 
      ...values,
    });
  }
  
  if (isLoadingTranslations && open) { 
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg flex flex-col items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) form.reset(); }}>
      <DialogContent 
        className="sm:max-w-lg flex flex-col max-h-[90vh]"
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('input[type="file"]')) {
             e.preventDefault();
          }
        }}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-headline">{t('EditSupplierDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('EditSupplierDialog.description', { supplierName: supplier?.name || 'supplier' })}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden">
            <ScrollArea className="flex-grow pr-4 -mr-4">
              <div className="space-y-4 pr-2">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('AddSupplierDialog.nameLabel')}</FormLabel><FormControl><Input placeholder={t('AddSupplierDialog.namePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="contactPerson" render={({ field }) => (<FormItem><FormLabel>{t('AddSupplierDialog.contactPersonLabel')}</FormLabel><FormControl><Input placeholder={t('AddSupplierDialog.contactPersonPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>{t('AddSupplierDialog.emailLabel')}</FormLabel><FormControl><Input type="email" placeholder={t('AddSupplierDialog.emailPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>{t('AddSupplierDialog.phoneLabel')}</FormLabel><FormControl><Input placeholder={t('AddSupplierDialog.phonePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>{t('AddSupplierDialog.addressLabel')}</FormLabel><FormControl><Textarea placeholder={t('AddSupplierDialog.addressPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>{t('AddSupplierDialog.websiteLabel')}</FormLabel><FormControl><Input placeholder={t('AddSupplierDialog.websitePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>{t('AddSupplierDialog.notesLabel')}</FormLabel><FormControl><Textarea placeholder={t('AddSupplierDialog.notesPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="isEnabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>{t('AddSupplierDialog.enabledLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
              
                <Accordion type="single" collapsible className="w-full mt-6">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-base">{t('SuppliersManager.updateCostsAccordionTitle')}</AccordionTrigger>
                    <AccordionContent>
                      {supplier && <UpdateCostsFromFile supplierId={supplier.id} />}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-6 mt-4 border-t shrink-0">
              <DialogClose asChild>
                <Button type="button" variant="outline">{t('AddSupplierDialog.cancelButton')}</Button>
              </DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{t('EditSupplierDialog.saveButton')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
