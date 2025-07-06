// src/services/translation.rx.service.ts
import { BehaviorSubject, Observable, Subscription, interval, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import type { TranslationData } from '@/types';
import { defaultLocale } from '@/i18n-config';
import { db, type TranslationDexieRecord } from '@/lib/dexie-db';
import { liveQuery } from 'dexie';

const TRANSLATION_POLLING_INTERVAL = 60000; // 1 minute
const LOCALE_STORAGE_KEY = 'preferredLocale';
const NEXT_LOCALE_COOKIE_KEY = 'NEXT_LOCALE';

function processTranslations(
  records: TranslationDexieRecord[],
  locale: string
): TranslationData {
  const localeTranslations: TranslationData = {};
  if (!Array.isArray(records)) return localeTranslations;
  
  records.forEach((entry) => {
    // Add a guard to prevent this error.
    if (!entry || typeof entry.keyPath !== 'string') {
        return; 
    }
    const keys = entry.keyPath.split('.');
    let currentLevel = localeTranslations;
    keys.forEach((key, index) => {
      if (index === keys.length - 1) {
        currentLevel[key] = entry.values?.[locale] || entry.values?.[defaultLocale] || entry.keyPath;
      } else {
        currentLevel[key] = currentLevel[key] || {};
        if (typeof currentLevel[key] === 'object' && currentLevel[key] !== null) {
          currentLevel = currentLevel[key] as TranslationData;
        } else {
          currentLevel[key] = {};
          currentLevel = currentLevel[key] as TranslationData;
        }
      }
    });
  });
  return localeTranslations;
}

class TranslationRxServiceController {
  private translationsSubject = new BehaviorSubject<TranslationData | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(true);
  private currentLocaleSubject = new BehaviorSubject<string>(defaultLocale);
  private pollingSubscription: Subscription | null = null;
  private isInitialized = false;

  public translations$: Observable<TranslationData | null> = this.translationsSubject.asObservable();
  public isLoading$: Observable<boolean> = this.isLoadingSubject.asObservable();
  public currentLocale$: Observable<string> = this.currentLocaleSubject.asObservable();

  constructor() {}

  public initialize(initialServerLocale: string): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const storedLocale = typeof window !== 'undefined' ? localStorage.getItem(LOCALE_STORAGE_KEY) : null;
    const localeToUse = storedLocale || initialServerLocale || defaultLocale;
    this.currentLocaleSubject.next(localeToUse);
    this.isLoadingSubject.next(true);

    // This liveQuery will automatically re-run whenever the 'translations' table changes in Dexie.
    const liveTranslations$ = from(liveQuery(() => db.translations.toArray()));
    
    // Subscribe to both locale changes and database changes
    this.currentLocale$.pipe(
      switchMap(locale => 
        liveTranslations$.pipe(
          switchMap(async (records) => {
            if (!records) { // Handle initial empty state from liveQuery
                 const initialRecords = await db.translations.toArray();
                 return processTranslations(initialRecords, locale);
            }
            return processTranslations(records as TranslationDexieRecord[], locale);
          })
        )
      )
    ).subscribe(processedTranslations => {
      this.translationsSubject.next(processedTranslations);
      // We are only truly "loading" on the very first hydration
      if (this.isLoadingSubject.value) {
        this.isLoadingSubject.next(false);
      }
    });

    // Populate from API and start polling
    this.populateTranslationsFromApi(true);
    this.initializePolling();
  }
  
  private initializePolling(): void {
    if (this.pollingSubscription) this.pollingSubscription.unsubscribe();
    this.pollingSubscription = interval(TRANSLATION_POLLING_INTERVAL)
      .subscribe(() => this.populateTranslationsFromApi(false));
  }

  private async populateTranslationsFromApi(isInitialLoad: boolean): Promise<void> {
    try {
      const response = await fetch('/api/translations/all-details');
      if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);
      
      const result = await response.json();
      if (result.success && result.data && result.data.translations) {
        const recordsForDb: TranslationDexieRecord[] = result.data.translations.map((entry: any) => ({
          keyPath: entry.keyPath,
          values: entry.values,
        }));
        await db.translations.bulkPut(recordsForDb);
      } else {
        throw new Error(result.error || 'Failed to parse translations from API');
      }
    } catch (error) {
      console.error(`Failed to populate translations from API:`, error);
    }
  }

  public async setCurrentLocaleAndLoadTranslations(newLocale: string): Promise<void> {
    if (newLocale === this.currentLocaleSubject.getValue()) return;

    this.currentLocaleSubject.next(newLocale);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      document.cookie = `${NEXT_LOCALE_COOKIE_KEY}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    }
  }

  public getCurrentLocaleValue(): string {
    return this.currentLocaleSubject.getValue();
  }

  public getIsLoadingValue(): boolean {
    return this.isLoadingSubject.getValue();
  }

  public getTranslationsValue(): TranslationData | null {
    return this.translationsSubject.getValue();
  }

  private getNestedValue(obj: TranslationData | null, path: string): string | undefined {
    if (!obj) return undefined;
    const keys = path.split('.');
    let current: any = obj;
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else { return undefined; }
    }
    return typeof current === 'string' ? current : undefined;
  }
  
  public t(key: string, params?: Record<string, string | number>): string {
    const translations = this.translationsSubject.getValue();
    const isLoading = this.isLoadingSubject.getValue();

    if (isLoading && !translations) return `...`;
    if (!translations) return key; 
    
    let translation = this.getNestedValue(translations, key);
    if (translation === undefined) return key; 

    if (params) {
      Object.keys(params).forEach(paramKey => {
        translation = translation!.replace(new RegExp(`{${paramKey}}`, 'g'), String(params[paramKey]));
      });
    }
    return translation!;
  }

  public dispose(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
    this.isInitialized = false;
  }
}

export const translationRxService = new TranslationRxServiceController();
