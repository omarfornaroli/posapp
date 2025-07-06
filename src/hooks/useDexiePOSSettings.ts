// src/hooks/useDexiePOSSettings.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import type { POSSetting } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const SINGLETON_KEY = 'global_pos_settings';
let isPopulating = false;

export function useDexiePOSSettings() {
  const [isLoading, setIsLoading] = useState(true);

  const posSettings = useLiveQuery(() => db.posSettings.get(SINGLETON_KEY), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const setting = await db.posSettings.get(SINGLETON_KEY);
    if (setting) {
      setIsLoading(false);
      return;
    }

    isPopulating = true;
    setIsLoading(true);
    try {
      const response = await fetch('/api/pos-settings');
      if (!response.ok) throw new Error('Failed to fetch initial pos settings');
      const result = await response.json();
      if (result.success) {
        await db.posSettings.put(result.data);
      } else {
        throw new Error(result.error || 'API error fetching initial pos settings');
      }
    } catch (error) {
      console.warn("[useDexiePOSSettings] Failed to populate initial data (likely offline):", error);
    } finally {
      setIsLoading(false);
      isPopulating = false;
    }
  }, []);
  
  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  return { posSettings, isLoading: isLoading || posSettings === undefined, refetch: populateInitialData };
}
