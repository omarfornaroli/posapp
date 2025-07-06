
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
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
import type { AppLanguage } from '@/types';
import { ScrollArea } from '../ui/scroll-area';

const appLanguageFormSchema = (t: Function, tCommonErrors: Function, existingCodes: string[]) => z.object({
  code: z.string()
    .min(2, { message: tCommonErrors('formErrors.minLength', {fieldName: t('codeLabel'), minLength: 2}) })
    .max(10, { message: tCommonErrors('formErrors.maxLength', {fieldName: t('codeLabel'), maxLength: 10}) })
    .regex(/^[a-z]{2,3}(?:-[A-Z]{2,3})?$/, { message: t('invalidLocaleCodeFormat') })
    .refine(code => !existingCodes.includes(code.toLowerCase()), { message: t('codeExistsError') }),
  name: z.string().min(2, { message: tCommonErrors('formErrors.minLength', {fieldName: t('nameLabel'), minLength: 2}) }),
  isEnabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

type AppLanguageFormData = z.infer<ReturnType<typeof appLanguageFormSchema>>;

interface AddAppLanguageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddLanguage: (newLangData: Omit<AppLanguage, 'id'>) => void;
  existingCodes: string[];
}

export default function AddAppLanguageDialog({ open, onOpenChange, onAddLanguage, existingCodes }: AddAppLanguageDialogProps) {
  const t = useTranslations('AddAppLanguageDialog');
  const tCommonErrors = useTranslations('Common');
  const currentSchema = appLanguageFormSchema(t, tCommonErrors, existingCodes);

  const form = useForm<AppLanguageFormData>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      code: '',
      name: '',
      isEnabled: true,
      isDefault: false,
    },
  });

  function onSubmit(values: AppLanguageFormData) {
    onAddLanguage({
        ...values,
        code: values.code.toLowerCase() // Ensure code is saved in lowercase
    });
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) form.reset(); }}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden">
            <ScrollArea className="flex-grow pr-6 -mr-6">
                <div className="space-y-4 py-4 pr-6">
                  <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>{t('codeLabel')}</FormLabel><FormControl><Input placeholder={t('codePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('nameLabel')}</FormLabel><FormControl><Input placeholder={t('namePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="isEnabled" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>{t('enabledLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                  <FormField control={form.control} name="isDefault" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><FormLabel>{t('defaultLabel')}</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                  </div>
                </div>
            </ScrollArea>
            <DialogFooter className="pt-4 mt-4 border-t shrink-0">
              <DialogClose asChild><Button type="button" variant="outline">{t('cancelButton')}</Button></DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{t('addButton')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
