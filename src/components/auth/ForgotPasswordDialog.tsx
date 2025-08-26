
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MailQuestion } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const forgotPasswordSchema = (t: Function) => z.object({
  email: z.string().email({ message: t('Common.formErrors.invalidEmail') }),
});

type ForgotPasswordFormValues = z.infer<ReturnType<typeof forgotPasswordSchema>>;

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const { t } = useRxTranslate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const schema = useMemo(() => forgotPasswordSchema(t), [t]);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (!open) form.reset();
  }, [open, form]);

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || t('ForgotPasswordDialog.requestFailedError'));
      }
      toast({
        title: t('ForgotPasswordDialog.requestSuccessTitle'),
        description: t('ForgotPasswordDialog.requestSuccessDescription'),
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('ForgotPasswordDialog.requestFailedError'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailQuestion className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center font-headline">{t('ForgotPasswordDialog.title')}</DialogTitle>
          <DialogDescription className="text-center">{t('ForgotPasswordDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('AddUserDialog.emailLabel')}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={t('AddUserDialog.emailPlaceholder')} {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>{t('Common.cancel')}</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('ForgotPasswordDialog.submitButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
