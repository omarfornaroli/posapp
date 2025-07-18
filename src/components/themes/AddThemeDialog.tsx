
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
import type { Theme, ThemeColors } from '@/types';
import { Loader2 } from 'lucide-react';

const addThemeFormSchema = (t: Function) => z.object({
  name: z.string().min(3, { message: t('Common.formErrors.minLength', {fieldName: t('ThemeManagerPage.themeNameLabel'), minLength: 3}) }),
});

type AddThemeFormData = z.infer<ReturnType<typeof addThemeFormSchema>>;

interface AddThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveTheme: (newThemeData: Omit<Theme, 'id' | 'isDefault' | 'createdAt' | 'updatedAt'>) => void;
}

const availableBodyFonts = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Noto Sans', 'Verdana', 'Arial'];
const availableHeadlineFonts = ['Poppins', 'Montserrat', 'Playfair Display', 'Oswald', 'Raleway', 'Georgia', 'Times New Roman'];

const getRandomFont = (fontArray: string[]): string => {
  return fontArray[Math.floor(Math.random() * fontArray.length)];
};

const generateRandomHslValue = (): string => {
  const h = Math.floor(Math.random() * 361); 
  const s = Math.floor(Math.random() * 71) + 30; 
  const l = Math.floor(Math.random() * 61) + 20; 
  return `${h} ${s}% ${l}%`;
};

const generateRandomThemeColors = (): ThemeColors => {
  return {
    background: `${Math.floor(Math.random() * 361)} ${Math.floor(Math.random() * 21) + 5}% ${Math.floor(Math.random() * 11) + 88}%`, 
    foreground: `${Math.floor(Math.random() * 361)} ${Math.floor(Math.random() * 21) + 5}% ${Math.floor(Math.random() * 21) + 5}%`, 
    card: generateRandomHslValue(),
    cardForeground: generateRandomHslValue(),
    popover: generateRandomHslValue(),
    popoverForeground: generateRandomHslValue(),
    primary: generateRandomHslValue(),
    primaryForeground: `${Math.floor(Math.random() * 361)} ${Math.floor(Math.random() * 21)}% ${Math.random() > 0.5 ? (Math.floor(Math.random() * 11) + 90) : (Math.floor(Math.random() * 11) + 0)}%`, 
    secondary: generateRandomHslValue(),
    secondaryForeground: generateRandomHslValue(),
    muted: generateRandomHslValue(),
    mutedForeground: generateRandomHslValue(),
    accent: generateRandomHslValue(),
    accentForeground: `${Math.floor(Math.random() * 361)} ${Math.floor(Math.random() * 21)}% ${Math.random() > 0.5 ? (Math.floor(Math.random() * 11) + 90) : (Math.floor(Math.random() * 11) + 0)}%`, 
    destructive: `0 ${Math.floor(Math.random() * 31) + 70}% ${Math.floor(Math.random() * 21) + 40}%`, 
    destructiveForeground: `0 0% ${Math.floor(Math.random()*11) + 90}%`, 
    border: generateRandomHslValue(),
    input: generateRandomHslValue(),
    ring: generateRandomHslValue(),
  };
};

export default function AddThemeDialog({ open, onOpenChange, onSaveTheme }: AddThemeDialogProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const currentAddThemeFormSchema = addThemeFormSchema(t);

  const form = useForm<AddThemeFormData>({
    resolver: zodResolver(currentAddThemeFormSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (!isLoadingTranslations && open) {
      form.trigger();
    }
  }, [isLoadingTranslations, open, form, t]);

  function onSubmit(values: AddThemeFormData) {
    const newThemeData: Omit<Theme, 'id' | 'isDefault' | 'createdAt' | 'updatedAt'> = {
      name: values.name,
      fontBody: getRandomFont(availableBodyFonts),
      fontHeadline: getRandomFont(availableHeadlineFonts),
      colors: generateRandomThemeColors(),
    };
    onSaveTheme(newThemeData);
    form.reset();
  }

  if (isLoadingTranslations && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md flex flex-col items-center justify-center h-60">
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
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) form.reset();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('AddThemeDialog.title')}</DialogTitle>
          <DialogDescription>{t('AddThemeDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('ThemeManagerPage.themeNameLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('AddThemeDialog.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('AddThemeDialog.cancelButton')}</Button>
              </DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{t('AddThemeDialog.generateAndSaveButton')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    