// src/hooks/useDexieThemes.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Theme } from '@/types';
import { useState, useEffect, useCallback, useRef } from 'react';

const generateId = () => `temp-${crypto.randomUUID()}`;
let isPopulating = false;

export function useDexieThemes() {
  const [isLoading, setIsLoading] = useState(true);
  const themes = useLiveQuery(() => db.themes.toArray(), []);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;
    isPopulating = true;
    
    // Always start by assuming we are loading, to ensure we get fresh data
    if(isMounted.current) setIsLoading(true);
    
    try {
      // Attempt to fetch from network regardless of cache, to get updates
      const response = await fetch('/api/themes');
      if (!response.ok) throw new Error('Failed to fetch themes');
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'API error fetching themes');

      const serverThemes: Theme[] = result.data;
      // bulkPut is an "upsert" - it will add new themes and update existing ones.
      await db.themes.bulkPut(serverThemes);

    } catch (error) {
      // If fetching fails (e.g., offline), we log the error but continue.
      // The useLiveQuery hook will still serve data from Dexie if it exists.
      console.warn("[useDexieThemes] Failed to populate themes (likely offline):", error);
    } finally {
      // Whether the fetch succeeded or failed, the initial data loading process is complete.
      if (isMounted.current) {
        setIsLoading(false);
      }
      isPopulating = false;
    }
  }, []);

  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  const addTheme = async (newTheme: Omit<Theme, 'id' | 'isDefault'>) => {
    const tempId = generateId();
    const themeWithId: Theme = {
      ...newTheme,
      id: tempId,
      isDefault: false,
    };
    await db.themes.add(themeWithId);
    await syncService.addToQueue({ entity: 'theme', operation: 'create', data: themeWithId });
  };

  const updateTheme = async (updatedTheme: Theme) => {
     try {
        if (updatedTheme.isDefault) {
          const oldDefault = await db.themes.where('isDefault').equals(1).first();
          if (oldDefault && oldDefault.id !== updatedTheme.id) {
              await db.themes.update(oldDefault.id, { isDefault: false });
              await syncService.addToQueue({ entity: 'theme', operation: 'update', data: { ...oldDefault, isDefault: false } });
          }
        }
        await db.themes.put(updatedTheme);
        await syncService.addToQueue({ entity: 'theme', operation: 'update', data: updatedTheme });
     } catch (e) {
         console.error("Failed to update theme in Dexie:", e);
         throw e;
     }
  };
  
  const deleteTheme = async (id: string) => {
    await db.themes.delete(id);
    await syncService.addToQueue({ entity: 'theme', operation: 'delete', data: { id } });
  };

  return { themes: themes || [], isLoading: isLoading || themes === undefined, refetch: populateInitialData, addTheme, updateTheme, deleteTheme };
}
