
// src/components/layout/LanguageSwitcher.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Globe, Loader2 } from 'lucide-react';
import { translationRxService } from '@/services/translation.rx.service';
import { useDexieAppLanguages } from '@/hooks/useDexieAppLanguages';

export default function LanguageSwitcher() {
  const { t, isLoading: isLoadingTranslations, currentLocale, initializeTranslations } = useRxTranslate();
  const { appLanguages, isLoading: isLoadingLanguages } = useDexieAppLanguages();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const handleLanguageChange = async (newLocale: string) => {
    if (newLocale === currentLocale) return;
    await translationRxService.setCurrentLocaleAndLoadTranslations(newLocale);
  };

  const availableLocales = useMemo(() => {
    return appLanguages.filter(lang => lang.isEnabled).sort((a, b) => a.name.localeCompare(b.name));
  }, [appLanguages]);

  if (!isClient || isLoadingTranslations || isLoadingLanguages) {
    return (
      <Button variant="ghost" size="icon" aria-label="Loading languages..." disabled>
        <Loader2 className="h-5 w-5 animate-spin" />
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              aria-label={t('LanguageSwitcher.changeLanguage') || 'Change Language'}
              className="h-10 px-2 flex items-center gap-1.5"
            >
              <Globe className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium uppercase">{currentLocale}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableLocales.map((locale) => (
              <DropdownMenuItem 
                key={locale.code} 
                onClick={() => handleLanguageChange(locale.code)}
                disabled={currentLocale === locale.code}
                className={currentLocale === locale.code ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
              >
                {t(`LanguageSwitcher.${locale.code}` as any, {}, { fallback: locale.name })}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipTrigger>
      <TooltipContent>
        <p>{t('LanguageSwitcher.changeLanguage') || 'Change Language'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
