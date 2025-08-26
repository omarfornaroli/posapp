

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User, UserRole } from '@/types';
import { Loader2, RefreshCw, Send } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const userRoles: readonly [UserRole, ...UserRole[]] = ['Admin', 'Editor', 'Viewer'];

const userFormSchema = (t: Function) => z.object({
  name: z.string().min(2, { message: t('Common.formErrors.minLength', {fieldName: t('AddUserDialog.nameLabel'), minLength: 2}) }),
  email: z.string().email({ message: t('Common.formErrors.invalidEmail') }),
  role: z.enum(userRoles, { errorMap: () => ({ message: t('Common.formErrors.requiredField', {fieldName: t('AddUserDialog.roleLabel')}) }) }),
  imageUrl: z.string().url({ message: t('Common.formErrors.invalidUrl', {fieldName: t('AddUserDialog.imageUrlLabel')}) }).optional().or(z.literal('')),
  authorizationCode: z.string().optional(),
});

type UserFormData = z.infer<ReturnType<typeof userFormSchema>>;

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSaveUser: (updatedUser: User) => void;
}

export default function EditUserDialog({ open, onOpenChange, user, onSaveUser }: EditUserDialogProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema(t)),
    defaultValues: {
      name: '',
      email: '',
      role: 'Viewer',
      imageUrl: '',
      authorizationCode: '',
    },
  });

  const authCode = form.watch('authorizationCode');

  useEffect(() => {
    if (authCode && canvasRef.current) {
      try {
        JsBarcode(canvasRef.current, authCode, {
          format: "CODE128",
          displayValue: false,
          margin: 0,
          width: 2,
          height: 50,
        });
        setBarcodeDataUrl(canvasRef.current.toDataURL());
      } catch (e) {
        console.error("Failed to generate barcode:", e);
        setBarcodeDataUrl(null);
      }
    } else {
      setBarcodeDataUrl(null);
    }
  }, [authCode]);

  useEffect(() => {
    if (user && open && !isLoadingTranslations) {
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role,
        imageUrl: user.imageUrl || '',
        authorizationCode: user.authorizationCode || '',
      });
    } else if (!open) {
      form.reset({ 
        name: '',
        email: '',
        role: 'Viewer',
        imageUrl: '',
        authorizationCode: '',
      });
    }
  }, [user, form, open, isLoadingTranslations, t]);

  useEffect(() => {
    if (!isLoadingTranslations && user && open) {
      form.trigger();
    }
  }, [isLoadingTranslations, user, open, form, t]);
  
  const handleGenerateNewCode = useCallback(() => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    form.setValue('authorizationCode', newCode, { shouldValidate: true, shouldDirty: true });
  }, [form]);

  const handleResendInvitation = async () => {
    if (!user) return;
    setIsResending(true);
    try {
      const response = await fetch(`/api/users/${user.id}/resend-invitation`, {
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to resend invitation.');
      }
      
      if (result.deliveryMethod === 'log') {
        toast({
          title: t('Toasts.smtpNotConfiguredTitle'),
          description: t('Toasts.userInviteLoggedToConsole', { userEmail: user.email }),
          duration: 8000,
        });
      } else {
        toast({
          title: t('Toasts.userInviteResentTitle'),
          description: t('Toasts.userInviteResentDescription', { userEmail: user.email }),
        });
      }

    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
      });
    } finally {
      setIsResending(false);
    }
  };

  function onSubmit(values: UserFormData) {
    if (!user) return; 
    onSaveUser({
      ...user, 
      ...values,
    });
  }

  if (isLoadingTranslations && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md flex flex-col items-center justify-center h-96">
          <DialogHeader className="sr-only">
            <DialogTitle>{t('Common.loadingTitle')}</DialogTitle>
          </DialogHeader>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        form.reset(); 
      }
    }}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('EditUserDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('EditUserDialog.description', {userName: user?.name || 'user'})}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden">
            <ScrollArea className="flex-grow pr-4 -mr-4">
              <div className="space-y-4 pr-2">
                  <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>{t('AddUserDialog.nameLabel')}</FormLabel>
                      <FormControl>
                          <Input placeholder={t('AddUserDialog.namePlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>{t('AddUserDialog.emailLabel')}</FormLabel>
                      <FormControl>
                          <Input type="email" placeholder={t('AddUserDialog.emailPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>{t('AddUserDialog.roleLabel')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                          <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder={t('AddUserDialog.rolePlaceholder')} />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                          {userRoles.map(role => (
                              <SelectItem key={role} value={role}>
                              {t(`AddUserDialog.roles.${role}`)}
                              </SelectItem>
                          ))}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>{t('AddUserDialog.imageUrlLabel')}</FormLabel>
                      <FormControl>
                          <Input placeholder={t('AddUserDialog.imageUrlPlaceholder')} {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                  control={form.control}
                  name="authorizationCode"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>{t('EditUserDialog.authCodeLabel')}</FormLabel>
                      <div className="flex items-center gap-2">
                          <FormControl>
                          <Input readOnly className="font-mono bg-muted/50" {...field} />
                          </FormControl>
                          <Button type="button" variant="outline" size="icon" onClick={handleGenerateNewCode} aria-label={t('EditUserDialog.generateNewCodeAria')}>
                          <RefreshCw className="h-4 w-4" />
                          </Button>
                      </div>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                  {barcodeDataUrl && (
                  <div className="flex flex-col items-center p-2 border rounded-md bg-muted">
                      <img src={barcodeDataUrl} alt="Authorization Code Barcode" data-ai-hint="barcode" />
                  </div>
                  )}
              </div>
              {user?.status === 'pending' && (
                <div className="pt-4 mt-4 border-t pr-2">
                  <p className="text-sm text-muted-foreground mb-2">{t('EditUserDialog.pendingUserHelpText')}</p>
                  <Button type="button" variant="secondary" onClick={handleResendInvitation} disabled={isResending} className="w-full">
                    {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {isResending ? t('EditUserDialog.resendingInviteButton') : t('EditUserDialog.resendInviteButton')}
                  </Button>
                </div>
              )}
            </ScrollArea>
            <DialogFooter className="pt-4 mt-auto shrink-0 border-t">
                <DialogClose asChild>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('AddUserDialog.cancelButton')}</Button>
                </DialogClose>
                <Button type="submit" className="bg-primary hover:bg-primary/90">{t('EditUserDialog.saveButton')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
