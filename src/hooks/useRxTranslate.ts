
// src/hooks/use-rx-translate.ts
import { useState, useEffect, useCallback } from 'react';
import { translationRxService } from '@/services/translation.rx.service';
import type { Subscription } from 'rxjs';
import type { TranslationData } from '@/types';

interface UseRxTranslateReturn {
  t: (key: string, params?: Record<string, string | number>, options?: { fallback?: string }) => string;
  isLoading: boolean;
  currentLocale: string;
  initializeTranslations: (locale: string) => void; 
}

export function useRxTranslate(): UseRxTranslateReturn {
  const [translations, setTranslations] = useState<Record<string, any> | null>(translationRxService.getTranslationsValue());
  const [isLoading, setIsLoading] = useState(translationRxService.getIsLoadingValue());
  const [currentLocale, setCurrentLocale] = useState(translationRxService.getCurrentLocaleValue());

  useEffect(() => {
    const subscriptions: Subscription[] = [];
    
    subscriptions.push(
      translationRxService.translations$.subscribe(setTranslations)
    );
    subscriptions.push(
      translationRxService.isLoading$.subscribe(setIsLoading)
    );
    subscriptions.push(
      translationRxService.currentLocale$.subscribe(setCurrentLocale)
    );

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, []);

  const initializeTranslations = useCallback((locale: string) => {
    // The service is now initialized once in AppLayout, so this can be a no-op
    // or simply ensure the locale is set if it hasn't been.
    if(translationRxService.getCurrentLocaleValue() !== locale){
       translationRxService.setCurrentLocaleAndLoadTranslations(locale);
    }
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>, options?: { fallback?: string }): string => {
    if (isLoading && !translations) {
      return options?.fallback || `...`; 
    }
    if (!translations) {
      return options?.fallback || key; 
    }
    
    return translationRxService.t(key, params) || options?.fallback || key;
  }, [translations, isLoading]);

  return { t, isLoading, currentLocale, initializeTranslations };
}
