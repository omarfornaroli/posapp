
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
            const serverData: TranslationDexieRecord[] = result.data.translations;
            await db.transaction('rw', db.translations, async () => {
                const localData = await db.translations.toArray();
                const localDataMap = new Map(localData.map(item => [item.keyPath, item]));
                const dataToUpdate: TranslationDexieRecord[] = [];

                for(const serverItem of serverData) {
                    const localItem = localDataMap.get(serverItem.keyPath);
                    if (!localItem) {
                        dataToUpdate.push(serverItem);
                    }
                    // For translations, there's no reliable 'updatedAt'. We will assume server is truth
                    // unless the local version has a pending sync operation, which will be handled
                    // by the sync service conflict resolution later.
                    // For now, let's just put them all, dexie's put will overwrite.
                    // A more advanced sync would need versioning on records.
                }
                // Simplified logic: Server is the source of truth for now.
                // A full conflict resolution implementation would require more complex logic.
                await db.translations.bulkPut(serverData);
            });
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
      await syncService.addToQueue({ entity: 'translation', operation: 'update', data: { keyPath: updatedRecord.keyPath, values: updatedRecord.values } });
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
