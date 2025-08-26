
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
import type { Client } from '@/types';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const clientFormSchema = (t: Function) => z.object({
  name: z.string().min(2, { message: t('Common.formErrors.minLength', {fieldName: t('AddClientDialog.nameLabel'), minLength: 2}) }),
  email: z.string().email({ message: t('Common.formErrors.invalidEmail', {fieldName: t('AddClientDialog.emailLabel')}) }), 
  phone: z.string().optional().or(z.literal('')), 
  address: z.string().optional().or(z.literal('')), 
});

type ClientFormData = z.infer<ReturnType<typeof clientFormSchema>>;

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddClient: (newClientData: Omit<Client, 'id' | 'registrationDate'>) => void;
}

export default function AddClientDialog({ open, onOpenChange, onAddClient }: AddClientDialogProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema(t)), 
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
  });
  
  useEffect(() => {
    if (!isLoadingTranslations && open) {
      form.trigger();
    }
  }, [isLoadingTranslations, open, form, t]);


  function onSubmit(values: ClientFormData) {
    onAddClient(values as Omit<Client, 'id' | 'registrationDate'>);
    form.reset(); 
  }

  if (isLoadingTranslations && open) { 
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[525px] flex flex-col items-center justify-center h-64">
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('AddClientDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('AddClientDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden">
             <ScrollArea className="flex-grow pr-6 -mr-6">
                <div className="space-y-4 py-4 pr-6">
                  <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('AddClientDialog.nameLabel')}</FormLabel><FormControl><Input placeholder={t('AddClientDialog.namePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>{t('AddClientDialog.emailLabel')}</FormLabel><FormControl><Input type="email" placeholder={t('AddClientDialog.emailPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>{t('AddClientDialog.phoneLabel')}</FormLabel><FormControl><Input placeholder={t('AddClientDialog.phonePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>{t('AddClientDialog.addressLabel')}</FormLabel><FormControl><Textarea placeholder={t('AddClientDialog.addressPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </ScrollArea>
            <DialogFooter className="pt-4 border-t mt-auto shrink-0">
              <DialogClose asChild>
                <Button type="button" variant="outline">{t('AddClientDialog.cancelButton')}</Button>
              </DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{t('AddClientDialog.addButton')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
