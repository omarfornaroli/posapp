

'use client';

import { useState, useEffect } from 'react';
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
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { KeyRound, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const authFormSchema = (t: Function) => z.object({
  authorizationCode: z.string().min(6, { message: t('AuthorizationDialog.codeLengthError') }),
});

type AuthFormData = z.infer<ReturnType<typeof authFormSchema>>;

interface AuthorizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AuthorizationDialog({ open, onOpenChange, onSuccess }: AuthorizationDialogProps) {
  const { t } = useRxTranslate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authFormSchema(t)),
    defaultValues: {
      authorizationCode: '',
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
      setIsSubmitting(false);
    }
  }, [open, form]);

  async function onSubmit(values: AuthFormData) {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || t('AuthorizationDialog.validationFailed'));
      }
      toast({
        title: t('AuthorizationDialog.successTitle'),
        description: t('AuthorizationDialog.successDescription'),
      });
      onSuccess();
    } catch (error) {
        toast({
            variant: 'destructive',
            title: t('Common.error'),
            description: error instanceof Error ? error.message : t('AuthorizationDialog.validationFailed'),
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
            <KeyRound className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center font-headline">{t('AuthorizationDialog.title')}</DialogTitle>
          <DialogDescription className="text-center">{t('AuthorizationDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="authorizationCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('AuthorizationDialog.codeLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="******"
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('Common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('AuthorizationDialog.submitButton')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
