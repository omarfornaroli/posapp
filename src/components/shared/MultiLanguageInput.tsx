
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Languages } from 'lucide-react';
import { useDexieAppLanguages } from '@/hooks/useDexieAppLanguages';
import type { MultiLanguageValue } from '@/types';

interface MultiLanguageInputProps {
  value: MultiLanguageValue;
  onChange: (value: MultiLanguageValue) => void;
  label: string;
  placeholder?: string;
  fieldId: string;
  isTextarea?: boolean;
}

export default function MultiLanguageInput({
  value,
  onChange,
  label,
  placeholder,
  fieldId,
  isTextarea = false,
}: MultiLanguageInputProps) {
  const { t, currentLocale } = useRxTranslate();
  const { appLanguages, isLoading } = useDexieAppLanguages();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [localValues, setLocalValues] = useState<MultiLanguageValue>(value || {});

  useEffect(() => {
    setLocalValues(value || {});
  }, [value]);

  const handleMainInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = { ...localValues, [currentLocale]: e.target.value };
    setLocalValues(newValue);
    onChange(newValue);
  };
  
  const handleDialogInputChange = (locale: string, text: string) => {
    setLocalValues(prev => ({ ...prev, [locale]: text }));
  };

  const handleDialogSave = () => {
    onChange(localValues);
    setIsDialogOpen(false);
  };
  
  const handleDialogCancel = () => {
    setLocalValues(value || {}); // Reset changes
    setIsDialogOpen(false);
  }

  const InputComponent = isTextarea ? Textarea : Input;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>
      <div className="flex items-center gap-2">
        <InputComponent
          id={fieldId}
          value={localValues[currentLocale] || ''}
          onChange={handleMainInputChange}
          placeholder={placeholder}
          className="flex-grow"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsDialogOpen(true)}
          aria-label={t('MultiLanguageInput.editAllLanguages')}
        >
          <Languages className="h-4 w-4" />
        </Button>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('MultiLanguageInput.dialogTitle', { fieldName: label })}</DialogTitle>
            <DialogDescription>{t('MultiLanguageInput.dialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {isLoading ? <p>{t('Common.loadingTitle')}</p> : appLanguages.filter(l => l.isEnabled).map(lang => (
              <div key={lang.code} className="space-y-1">
                <Label htmlFor={`${fieldId}-${lang.code}`}>{lang.name}</Label>
                <InputComponent
                  id={`${fieldId}-${lang.code}`}
                  value={localValues[lang.code] || ''}
                  onChange={(e) => handleDialogInputChange(lang.code, e.target.value)}
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleDialogCancel}>{t('Common.cancel')}</Button>
            <Button type="button" onClick={handleDialogSave}>{t('Common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

