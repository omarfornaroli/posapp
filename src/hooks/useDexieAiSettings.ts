// src/hooks/useDexieAiSettings.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import type { AiSetting } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { getApiPath } from '@/lib/utils';

const SINGLETON_KEY = 'global_ai_settings';
let isPopulating = false;

interface AiSettingsWithStatus extends AiSetting {
    isKeySet?: boolean;
}

export function useDexieAiSettings() {
  const [isLoading, setIsLoading] = useState(true);

  const aiSettings = useLiveQuery(async () => {
    // This part runs within Dexie's live query scope
    const settings = await db.aiSettings.get(SINGLETON_KEY);
    // Since we can't do a fetch here, we rely on the populate function
    // to fetch the status and update the record. For now, we return what we have.
    return settings as AiSettingsWithStatus | null;
  }, []);
  
  const populateInitialData = useCallback(async (force = false) => {
    if (isPopulating && !force) return;

    const shouldFetch = navigator.onLine;
    if (!shouldFetch) {
        setIsLoading(false);
        return;
    }

    isPopulating = true;
    setIsLoading(true);
    try {
      const response = await fetch(getApiPath('/api/settings/ai'));
      if (!response.ok) throw new Error('Failed to fetch initial AI settings');
      const result = await response.json();
      if (result.success) {
        // Since the key itself is not sent, we just store the status.
        const currentData = await db.aiSettings.get(SINGLETON_KEY);
        const dataToStore: AiSetting = {
          id: currentData?.id || SINGLETON_KEY, // Use existing ID or the key
          key: SINGLETON_KEY,
          isKeySet: result.data.isKeySet,
        };
        await db.aiSettings.put(dataToStore);
      } else {
        throw new Error(result.error || 'API error fetching initial AI settings');
      }
    } catch (error) {
      console.warn("[useDexieAiSettings] Failed to populate initial data:", error);
    } finally {
      setIsLoading(false);
      isPopulating = false;
    }
  }, []);
  
  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  return { aiSettings, isLoading: isLoading || aiSettings === undefined, refetch: () => populateInitialData(true) };
}