'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useMemo } from 'react';

const DEFAULT_CURRENCY_CODE = 'USD'; // This will be the fallback if nothing is set.
const CURRENCY_STORAGE_KEY = 'preferredCurrency';

interface CurrencyContextType {
  currency: string;
  setCurrency: (currencyCode: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CURRENCY_STORAGE_KEY) || DEFAULT_CURRENCY_CODE;
    }
    return DEFAULT_CURRENCY_CODE;
  });

  // This effect listens for changes in localStorage from other tabs.
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === CURRENCY_STORAGE_KEY && event.newValue && event.newValue !== currency) {
        setCurrencyState(event.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currency]);

  const setCurrency = (currencyCode: string) => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, currencyCode);
    setCurrencyState(currencyCode);
    // Dispatch a custom event that other parts of the app can listen to if needed.
    window.dispatchEvent(new CustomEvent('currencyChanged', { detail: currencyCode }));
  };
  
  const value = useMemo(() => ({ currency, setCurrency }), [currency]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextType {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
