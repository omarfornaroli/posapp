

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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User, UserRole } from '@/types';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const userRoles: [UserRole, ...UserRole[]] = ['Admin', 'Editor', 'Viewer'];

const userFormSchema = (t: Function) => z.object({
  name: z.string().min(2, { message: t('Common.formErrors.minLength', {fieldName: t('AddUserDialog.nameLabel'), minLength: 2}) }),
  email: z.string().email({ message: t('Common.formErrors.invalidEmail') }),
  role: z.enum(userRoles, { errorMap: () => ({ message: t('Common.formErrors.requiredField', {fieldName: t('AddUserDialog.roleLabel')}) }) }),
  imageUrl: z.string().url({ message: t('Common.formErrors.invalidUrl', {fieldName: t('AddUserDialog.imageUrlLabel')}) }).optional().or(z.literal('')),
});

type UserFormData = z.infer<ReturnType<typeof userFormSchema>>;

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddUser: (newUserData: Omit<User, 'id' | 'joinDate' | 'status' | 'permissions'>) => void;
}

export default function AddUserDialog({ open, onOpenChange, onAddUser }: AddUserDialogProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
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
    },
  });

  useEffect(() => {
    if (!isLoadingTranslations && open) {
      form.trigger();
    }
  }, [isLoadingTranslations, open, form, t]);

  function onSubmit(values: UserFormData) {
    onAddUser(values);
    form.reset();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('AddUserDialog.title')}</DialogTitle>
          <DialogDescription>{t('AddUserDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden">
             <ScrollArea className="flex-grow pr-6 -mr-6">
                <div className="space-y-4 py-4 pr-6">
                  <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('AddUserDialog.nameLabel')}</FormLabel><FormControl><Input placeholder={t('AddUserDialog.namePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>{t('AddUserDialog.emailLabel')}</FormLabel><FormControl><Input type="email" placeholder={t('AddUserDialog.emailPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>{t('AddUserDialog.roleLabel')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('AddUserDialog.rolePlaceholder')} /></SelectTrigger></FormControl><SelectContent>{userRoles.map(role => (<SelectItem key={role} value={role}>{t(`AddUserDialog.roles.${role}`)}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="imageUrl" render={({ field }) => (<FormItem><FormLabel>{t('AddUserDialog.imageUrlLabel')}</FormLabel><FormControl><Input placeholder={t('AddUserDialog.imageUrlPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
            </ScrollArea>
            <DialogFooter className="pt-4 mt-auto shrink-0 border-t">
              <DialogClose asChild>
                <Button type="button" variant="outline">{t('AddUserDialog.cancelButton')}</Button>
              </DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{t('AddUserDialog.addButton')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
