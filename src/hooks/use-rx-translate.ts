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
      translationRxService.translations$.subscribe(data => {
        setTranslations(data);
      })
    );
    subscriptions.push(
      translationRxService.isLoading$.subscribe(loading => {
        setIsLoading(loading);
      })
    );
    subscriptions.push(
      translationRxService.currentLocale$.subscribe(locale => {
        setCurrentLocale(locale);
      })
    );

    // Initial check if service is already initialized and has a locale
    const serviceInitialLocale = translationRxService.getCurrentLocaleValue();
    if (serviceInitialLocale !== currentLocale) {
        setCurrentLocale(serviceInitialLocale);
    }
    const serviceInitialLoading = translationRxService.getIsLoadingValue();
    if (serviceInitialLoading !== isLoading) {
        setIsLoading(serviceInitialLoading);
    }
     const serviceInitialTranslations = translationRxService.getTranslationsValue();
    if (JSON.stringify(serviceInitialTranslations) !== JSON.stringify(translations)) {
        setTranslations(serviceInitialTranslations);
    }


    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, []);

  // This function is now a no-op as initialization is handled globally in AppLayout.
  // It's kept for API compatibility in case any components still call it.
  const initializeTranslations = useCallback((locale: string) => {}, []);

  const t = useCallback((key: string, params?: Record<string, string | number>, options?: { fallback?: string }): string => {
    if (isLoading) {
      return options?.fallback || `...`; 
    }
    if (!translations) {
      return options?.fallback || key; 
    }
    
    // Use the t method from the service, which handles nesting
    return translationRxService.t(key, params) || options?.fallback || key;
  }, [translations, isLoading]);

  return { t, isLoading, currentLocale, initializeTranslations };
}
