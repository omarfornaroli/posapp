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
  const [isLoading, setIsLoading] = useState(translationRxService.getIsLoadingValue()); // Reflects service loading state
  const [currentLocale, setCurrentLocale] = useState(translationRxService.getCurrentLocaleValue()); // Use getter for initial value

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
    // This helps if the hook mounts after the service has already been initialized by AppLayout
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
  }, []); // Empty dependency array: setup subscriptions once

  // This function is called by components, typically with the server-rendered locale.
  // The service itself will decide if it needs to re-fetch or use this as a hint.
  const initializeTranslations = useCallback((locale: string) => {
    // The service's initialize method (called from AppLayout) is now the primary initializer.
    // This can be a no-op or a way to ensure the service is aware of the page's context if needed in future.
    // For now, AppLayout's initialization of the service should cover it.
  }, []);

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
