// src/components/layout/LanguageSwitcher.tsx
'use client';

import { useEffect, useState } from 'react';
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

const availableLocales = ['en', 'es'];

export default function LanguageSwitcher() {
  const { t, isLoading: isLoadingTranslations, currentLocale, initializeTranslations } = useRxTranslate();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const handleLanguageChange = async (newLocale: string) => {
    if (newLocale === currentLocale) return;
    await translationRxService.setCurrentLocaleAndLoadTranslations(newLocale);
    window.location.reload(); // Force reload to apply changes everywhere
  };

  if (!isClient || isLoadingTranslations) {
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
                key={locale} 
                onClick={() => handleLanguageChange(locale)}
                disabled={currentLocale === locale}
                className={currentLocale === locale ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
              >
                {t(`LanguageSwitcher.${locale}` as any, {}, { fallback: locale.toUpperCase() })}
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
