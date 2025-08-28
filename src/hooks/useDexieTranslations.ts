
// src/hooks/useDexieTranslations.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type TranslationDexieRecord } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import { useState, useEffect, useCallback } from 'react';

let isPopulating = false;

export function useDexieTranslations() {
  const [isLoading, setIsLoading] = useState(true);

  const translations = useLiveQuery(() => db.translations.toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;
    
    const shouldFetch = navigator.onLine;

    if (shouldFetch) {
      isPopulating = true;
      setIsLoading(true);
      try {
        const response = await fetch('/api/translations/all-details');
        if (!response.ok) throw new Error('Failed to fetch initial translations');
        const result = await response.json();
        if (result.success && result.data?.translations) {
          await db.translations.bulkPut(result.data.translations);
        } else {
          throw new Error(result.error || 'API error fetching initial translations');
        }
      } catch (error) {
        console.warn("[useDexieTranslations] Failed to populate initial data:", error);
      } finally {
        setIsLoading(false);
        isPopulating = false;
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  const updateTranslation = async (updatedRecord: TranslationDexieRecord) => {
    try {
      await db.translations.put(updatedRecord);
      await syncService.addToQueue({ entity: 'translation', operation: 'update', data: updatedRecord });
    } catch (error) {
      console.error("Failed to update translation in Dexie:", error);
      throw error;
    }
  };

  return { 
    translations: translations || [], 
    isLoading: isLoading || translations === undefined, 
    refetch: populateInitialData,
    updateTranslation 
  };
}
