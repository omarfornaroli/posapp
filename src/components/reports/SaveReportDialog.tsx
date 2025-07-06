
'use client';

import { useEffect, useMemo } from 'react';
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

const saveReportSchema = (t: Function) => z.object({
  name: z.string().min(3, { message: t('Common.formErrors.minLength', { fieldName: t('ReportsPage.reportNameLabel'), minLength: 3 }) }),
  description: z.string().optional(),
});

type SaveReportFormData = z.infer<ReturnType<typeof saveReportSchema>>;

interface SaveReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (details: { name: string; description?: string }) => void;
  initialQuery?: string;
}

export default function SaveReportDialog({ open, onOpenChange, onSave, initialQuery }: SaveReportDialogProps) {
  const { t } = useRxTranslate();
  const formSchema = useMemo(() => saveReportSchema(t), [t]);

  const form = useForm<SaveReportFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '' },
  });
  
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  function onSubmit(values: SaveReportFormData) {
    onSave(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('ReportsPage.saveReportDialogTitle')}</DialogTitle>
          <DialogDescription>{t('ReportsPage.saveReportDialogDescription')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormItem>
              <FormLabel>{t('ReportsPage.originalQueryLabel')}</FormLabel>
              <p className="text-sm text-muted-foreground p-2 border rounded-md bg-muted">{initialQuery}</p>
            </FormItem>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('ReportsPage.reportNameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('ReportsPage.reportNamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('ReportsPage.reportDescriptionLabel')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('ReportsPage.reportDescriptionPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('Common.cancel')}
              </Button>
              <Button type="submit">{t('Common.save')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    