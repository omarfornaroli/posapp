
'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import ColorPickerInput from './ColorPickerInput'; 
import { Loader2 } from 'lucide-react';

const hslColorStringSchema = (t: Function) => z.string().regex(
  /^\d{1,3}\s+(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%$/,
  { message: "Invalid HSL format. E.g., '210 40% 96.1%'" } 
).refine(value => {
  const parts = value.match(/^(\d{1,3})\s+(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%$/);
  if (!parts) return false;
  const h = parseInt(parts[1], 10);
  const s = parseFloat(parts[2]);
  const l = parseFloat(parts[3]);
  return h >= 0 && h <= 360 && s >= 0 && s <= 100 && l >= 0 && l <= 100;
}, { message: "HSL values out of range (H: 0-360, S/L: 0-100%)" });


const themeColorsSchema = (t: Function) => z.object({
  background: hslColorStringSchema(t),
  foreground: hslColorStringSchema(t),
  card: hslColorStringSchema(t),
  cardForeground: hslColorStringSchema(t),
  popover: hslColorStringSchema(t),
  popoverForeground: hslColorStringSchema(t),
  primary: hslColorStringSchema(t),
  primaryForeground: hslColorStringSchema(t),
  secondary: hslColorStringSchema(t),
  secondaryForeground: hslColorStringSchema(t),
  muted: hslColorStringSchema(t),
  mutedForeground: hslColorStringSchema(t),
  accent: hslColorStringSchema(t),
  accentForeground: hslColorStringSchema(t),
  destructive: hslColorStringSchema(t),
  destructiveForeground: hslColorStringSchema(t),
  border: hslColorStringSchema(t),
  input: hslColorStringSchema(t),
  ring: hslColorStringSchema(t),
});

const themeFormSchema = (t: Function) => z.object({
  name: z.string(), 
  fontBody: z.string().min(1, { message: t('Common.formErrors.requiredField', {fieldName: t('ThemeManagerPage.fontBodyLabel')})}),
  fontHeadline: z.string().min(1, { message: t('Common.formErrors.requiredField', {fieldName: t('ThemeManagerPage.fontHeadlineLabel')})}),
  colors: themeColorsSchema(t),
});

export type ThemeFormData = z.infer<ReturnType<typeof themeFormSchema>>;

interface EditThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: Theme | null;
  onSaveTheme: (updatedTheme: Theme) => void;
}

export default function EditThemeDialog({ open, onOpenChange, theme, onSaveTheme }: EditThemeDialogProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const currentThemeFormSchema = themeFormSchema(t);

  const form = useForm<ThemeFormData>({
    resolver: zodResolver(currentThemeFormSchema),
    defaultValues: {
      name: '', fontBody: 'Inter', fontHeadline: 'Poppins',
      colors: {
        background: '0 0% 100%', foreground: '0 0% 0%', card: '0 0% 100%', cardForeground: '0 0% 0%',
        popover: '0 0% 100%', popoverForeground: '0 0% 0%', primary: '260 100% 50%', primaryForeground: '0 0% 100%',
        secondary: '240 5% 95%', secondaryForeground: '240 5% 10%', muted: '240 5% 95%', mutedForeground: '240 4% 46%',
        accent: '300 100% 50%', accentForeground: '0 0% 100%', destructive: '0 84% 60%', destructiveForeground: '0 0% 100%',
        border: '240 6% 90%', input: '240 6% 90%', ring: '260 100% 50%',
      },
    },
  });

  useEffect(() => {
    if (theme && open && !isLoadingTranslations) {
      form.reset({
        name: theme.name,
        fontBody: theme.fontBody,
        fontHeadline: theme.fontHeadline,
        colors: { ...theme.colors }, 
      });
    }
  }, [theme, open, form, isLoadingTranslations, t]);

  useEffect(() => {
    if (!isLoadingTranslations && theme && open) {
      form.trigger();
    }
  }, [isLoadingTranslations, theme, open, form, t]);

  function onSubmit(values: ThemeFormData) {
    if (!theme) return;
    const updatedThemeData: Theme = {
      ...theme, 
      name: values.name, 
      fontBody: values.fontBody,
      fontHeadline: values.fontHeadline,
      colors: values.colors,
    };
    onSaveTheme(updatedThemeData);
  }

  if (isLoadingTranslations && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl flex flex-col items-center justify-center min-h-[70vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>{t('Common.loadingTitle')}</DialogTitle>
            <DialogDescription>{t('Common.loadingDescription')}</DialogDescription>
          </DialogHeader>
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) form.reset();
    }}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('EditThemeDialog.title', { themeName: theme?.name || '' })}</DialogTitle>
          <DialogDescription>{t('EditThemeDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden">
            <div className="flex-grow overflow-y-auto pr-4">
              <div className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('ThemeManagerPage.themeNameLabel')}</FormLabel><FormControl><Input {...field} readOnly disabled className="bg-muted/50 cursor-default"/></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="fontBody" render={({ field }) => (<FormItem><FormLabel>{t('ThemeManagerPage.fontBodyLabel')}</FormLabel><FormControl><Input placeholder="e.g., Inter, 'Open Sans', sans-serif" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="fontHeadline" render={({ field }) => (<FormItem><FormLabel>{t('ThemeManagerPage.fontHeadlineLabel')}</FormLabel><FormControl><Input placeholder="e.g., Poppins, Montserrat, serif" {...field} /></FormControl><FormMessage /></FormItem>)} />
                
                <h3 className="text-lg font-medium pt-2">{t('ThemeManagerPage.colorsSectionTitle')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {theme && Object.keys(theme.colors).map((colorKey) => (
                    <FormField
                      key={colorKey}
                      control={form.control}
                      name={`colors.${colorKey as keyof ThemeColors}` as any} 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="capitalize">{colorKey.replace(/([A-Z])/g, ' $1').trim()}</FormLabel>
                          <FormControl>
                            <ColorPickerInput
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="pt-6 border-t shrink-0">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('EditThemeDialog.cancelButton')}</Button>
              </DialogClose>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{t('EditThemeDialog.saveButton')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
