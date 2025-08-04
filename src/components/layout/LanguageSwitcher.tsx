
'use client';

import { useEffect } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { locales as availableLocales } from '@/i18n-config';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Globe, Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { translationRxService } from '@/services/translation.rx.service';

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, isLoading: isLoadingTranslations, currentLocale: rxLocale, initializeTranslations } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(rxLocale);
  }, [initializeTranslations, rxLocale]);
  
  const handleLanguageChange = async (newLocale: string) => {
    if (newLocale === rxLocale) return;
    await translationRxService.setCurrentLocaleAndLoadTranslations(newLocale);
    // The middleware will handle redirecting to the same path with the new locale if necessary.
    // For `as-needed` this might just refresh data.
    router.refresh(); 
  };

  if (isLoadingTranslations) {
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
              <span className="text-sm font-medium uppercase">{rxLocale}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableLocales.map((locale) => (
              <DropdownMenuItem 
                key={locale} 
                onClick={() => handleLanguageChange(locale)}
                disabled={rxLocale === locale}
                className={rxLocale === locale ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
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
