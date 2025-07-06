
'use client';

import { useEffect } from 'react';
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

// Schema allows editing name, isEnabled, isDefault. Code is not editable.
const appLanguageFormSchema = (t: Function, tCommonErrors: Function) => z.object({
  name: z.string().min(2, { message: tCommonErrors('formErrors.minLength', {fieldName: t('nameLabel'), minLength: 2}) }),
  isEnabled: z.boolean(),
  isDefault: z.boolean(),
});

type AppLanguageFormData = z.infer<ReturnType<typeof appLanguageFormSchema>>;

interface EditAppLanguageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: AppLanguage | null;
  onSaveLanguage: (updatedLangData: AppLanguage) => void;
}

export default function EditAppLanguageDialog({ open, onOpenChange, language, onSaveLanguage }: EditAppLanguageDialogProps) {
  const t = useTranslations('EditAppLanguageDialog');
  const tAddLabels = useTranslations('AddAppLanguageDialog'); // For reusing labels
  const tCommonErrors = useTranslations('Common');
  const currentSchema = appLanguageFormSchema(tAddLabels, tCommonErrors);

  const form = useForm<AppLanguageFormData>({
    resolver: zodResolver(currentSchema),
  });

  useEffect(() => {
    if (language && open) {
      form.reset({
        name: language.name,
        isEnabled: language.isEnabled,
        isDefault: language.isDefault,
      });
    } else if (!open) {
      form.reset({ name: '', isEnabled: true, isDefault: false });
    }
  }, [language, open, form]);

  function onSubmit(values: AppLanguageFormData) {
    if (!language) return;
    onSaveLanguage({
      ...language, // Preserve id and code
      name: values.name,
      isEnabled: values.isEnabled,
      isDefault: values.isDefault,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) form.reset(); }}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('title', {langName: language?.name || ''})}</DialogTitle>
          <DialogDescription>{t('description', {langName: language?.name || 'language'})}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden">
            <ScrollArea className="flex-grow pr-6 -mr-6">
              <div className="space-y-4 py-4 pr-6">
                <FormItem>
                  <FormLabel>{tAddLabels('codeLabel')}</FormLabel>
                  <FormControl><Input value={language?.code || ''} readOnly disabled className="bg-muted/50 cursor-not-allowed" /></FormControl>
                  <FormMessage />
                </FormItem>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{tAddLabels('nameLabel')}</FormLabel>
                      <FormControl><Input placeholder={tAddLabels('namePlaceholder')} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <FormLabel>{tAddLabels('enabledLabel')}</FormLabel>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <FormLabel>{tAddLabels('defaultLabel')}</FormLabel>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )}
                />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4 mt-4 border-t shrink-0">
              <DialogClose asChild><Button type="button" variant="outline">{tAddLabels('cancelButton')}</Button></DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{t('saveButton')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
