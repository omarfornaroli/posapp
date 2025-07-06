// src/hooks/useDexieReceiptSettings.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import type { ReceiptSetting } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { SINGLETON_KEY } from '@/models/ReceiptSetting';

let isPopulating = false;

export function useDexieReceiptSettings() {
  const [isLoading, setIsLoading] = useState(true);

  const receiptSettings = useLiveQuery(() => db.receiptSettings.get(SINGLETON_KEY), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const setting = await db.receiptSettings.get(SINGLETON_KEY);
    if (setting) {
      setIsLoading(false);
      return;
    }

    isPopulating = true;
    setIsLoading(true);
    try {
      const response = await fetch('/api/receipt-settings');
      if (!response.ok) throw new Error('Failed to fetch initial receipt settings');
      const result = await response.json();
      if (result.success) {
        await db.receiptSettings.put(result.data);
      } else {
        throw new Error(result.error || 'API error fetching initial receipt settings');
      }
    } catch (error) {
      console.warn("[useDexieReceiptSettings] Failed to populate initial data (likely offline):", error);
    } finally {
      setIsLoading(false);
      isPopulating = false;
    }
  }, []);
  
  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  return { receiptSettings, isLoading: isLoading || receiptSettings === undefined, refetch: populateInitialData };
}
