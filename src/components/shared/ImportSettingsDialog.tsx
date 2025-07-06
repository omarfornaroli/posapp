
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

const conflictResolutionOptions = ['skip', 'overwrite'] as const; 

const importSettingsSchema = (t: Function) => z.object({
  conflictResolution: z.enum(conflictResolutionOptions, {
    required_error: t('Common.formErrors.requiredField', {fieldName: t('ImportProductsSettingsDialog.conflictResolutionLabel')}),
  }).default('skip'),
  defaultCategory: z.string().optional(),
});

export type ImportSettingsFormData = z.infer<ReturnType<typeof importSettingsSchema>>;

interface ImportSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  itemCount: number;
  onConfirmImport: (settings: ImportSettingsFormData) => void;
  isImporting: boolean;
  showDefaultCategory?: boolean;
}

export default function ImportSettingsDialog({
  open,
  onOpenChange,
  fileName,
  itemCount,
  onConfirmImport,
  isImporting,
  showDefaultCategory = false,
}: ImportSettingsDialogProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const currentSchema = importSettingsSchema(t);

  const form = useForm<ImportSettingsFormData>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      conflictResolution: 'skip',
      defaultCategory: '',
    },
  });

  useEffect(() => {
    if (!isLoadingTranslations && open) {
      form.trigger(); 
    }
  }, [isLoadingTranslations, open, form, t]);

  function onSubmit(values: ImportSettingsFormData) {
    onConfirmImport(values);
  }

  if (isLoadingTranslations && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md flex justify-center items-center h-72">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (isImporting && isOpen) return; 
        onOpenChange(isOpen);
        if (!isOpen) form.reset();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('ImportProductsSettingsDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('ImportProductsSettingsDialog.description', { count: itemCount, fileName: fileName })}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="conflictResolution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('ImportProductsSettingsDialog.conflictResolutionLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isImporting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('ImportProductsSettingsDialog.conflictResolutionPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="skip">{t('ImportProductsSettingsDialog.conflictResolutionSkip')}</SelectItem>
                      <SelectItem value="overwrite">{t('ImportProductsSettingsDialog.conflictResolutionOverwrite')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {showDefaultCategory && (
                <FormField
                control={form.control}
                name="defaultCategory"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{t('ImportProductsSettingsDialog.defaultCategoryLabel')}</FormLabel>
                    <FormControl>
                        <Input placeholder={t('ImportProductsSettingsDialog.defaultCategoryPlaceholder')} {...field} disabled={isImporting} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>{t('ImportProductsSettingsDialog.cancelButton')}</Button>
              </DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isImporting}>
                {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isImporting ? t('Toasts.importingButton') : t('ImportProductsSettingsDialog.importButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
