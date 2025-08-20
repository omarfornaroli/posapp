
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
  
  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;
    
    // Set initial loading state based on whether there's data to show
    const count = await db.themes.count();
    setIsLoading(count === 0);
    
    isPopulating = true;
    
    try {
      const response = await fetch('/api/themes');
      if (!response.ok) throw new Error('Failed to fetch themes');
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'API error fetching themes');

      const serverThemes: Theme[] = result.data;
      
      await db.themes.clear();
      await db.themes.bulkAdd(serverThemes);
      console.log(`[useDexieThemes] Cleared and re-populated ${serverThemes.length} themes.`);
      
    } catch (error) {
      console.warn("[useDexieThemes] Failed to populate themes (likely offline):", error);
    } finally {
      // Always set loading to false after the attempt, regardless of outcome
      setIsLoading(false);
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
          // Find the current default in Dexie and prepare an update operation for it
          const oldDefault = await db.themes.where('isDefault').equals(1).first();
          if (oldDefault && oldDefault.id !== updatedTheme.id) {
              await db.themes.update(oldDefault.id, { isDefault: false });
              // Also queue the update for the old default to be synced
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

  // The hook is loading only if the themes array is undefined (initial state of useLiveQuery)
  const finalIsLoading = themes === undefined;

  return { themes: themes || [], isLoading: finalIsLoading, refetch: populateInitialData, addTheme, updateTheme, deleteTheme };
}
