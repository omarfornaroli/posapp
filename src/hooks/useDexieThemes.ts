
// src/hooks/useDexieThemes.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Theme } from '@/types';
import { useState, useEffect, useCallback, useRef } from 'react';

const generateId = () => `temp-${crypto.randomUUID()}`;
let isPopulating = false;
let hasInitiallyPopulated = false;

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
    // Only run the population logic once per app lifecycle
    if (hasInitiallyPopulated) {
        setIsLoading(false);
        return;
    }
    
    isPopulating = true;
    if (isMounted.current) {
        setIsLoading(true);
    }
    
    try {
      const response = await fetch('/api/themes');
      if (!response.ok) throw new Error('Failed to fetch themes');
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'API error fetching themes');

      const serverThemes: Theme[] = result.data;
      await db.themes.bulkPut(serverThemes);

    } catch (error) {
      console.warn("[useDexieThemes] Failed to populate themes (likely offline):", error);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
      isPopulating = false;
      hasInitiallyPopulated = true;
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
          // Find the current default theme in the database.
          const oldDefault = await db.themes.where('isDefault').equals(1).first();
          
          // If there is an old default and it's not the one we're currently updating, unset it.
          if (oldDefault && oldDefault.id !== updatedTheme.id) {
              await db.themes.update(oldDefault.id, { isDefault: false });
              // Also queue this change for sync.
              await syncService.addToQueue({ entity: 'theme', operation: 'update', data: { ...oldDefault, isDefault: false } });
          }
        }
        
        // Now, save the updated theme (which might be the new default).
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

  const finalIsLoading = isLoading || themes === undefined;

  return { themes: themes || [], isLoading: finalIsLoading, refetch: populateInitialData, addTheme, updateTheme, deleteTheme };
}
