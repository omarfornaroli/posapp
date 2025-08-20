
// src/hooks/useDexieThemes.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Theme } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const generateId = () => `temp-${crypto.randomUUID()}`;

export function useDexieThemes() {
  const [isLoading, setIsLoading] = useState(true);

  const populateInitialData = useCallback(async () => {
    // No change to setIsLoading here to prevent UI flicker.
    // Let the live query handle the loading state based on data availability.
    try {
      const response = await fetch('/api/themes');
      if (!response.ok) throw new Error('Failed to fetch themes');
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'API error fetching themes');

      const serverThemes: Theme[] = result.data;
      
      await db.transaction('rw', db.themes, async () => {
        // Clear local data only when we have new data to insert.
        await db.themes.clear();
        await db.themes.bulkAdd(serverThemes);
      });
      
    } catch (error) {
      console.warn("[useDexieThemes] Failed to populate themes (likely offline). Using local data.", error);
    }
  }, []);

  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);
  
  const themes = useLiveQuery(
    () => db.themes.orderBy('name').toArray(), 
    [], 
    []
  );

  useEffect(() => {
    // The hook is considered "loading" only if the live query result is undefined
    // (meaning Dexie hasn't populated it yet). Once we have an array (even an empty one),
    // we are no longer in an initial loading state.
    if (themes !== undefined) {
      setIsLoading(false);
    }
  }, [themes]);

  const addTheme = async (newTheme: Omit<Theme, 'id' | 'isDefault' | 'createdAt' | 'updatedAt'>) => {
    const tempId = generateId();
    const themeWithId: Theme = {
      ...newTheme,
      id: tempId,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.themes.add(themeWithId);
    await syncService.addToQueue({ entity: 'theme', operation: 'create', data: themeWithId });
  };

  const updateTheme = async (updatedTheme: Theme) => {
    try {
      await db.transaction('rw', db.themes, async () => {
        if (updatedTheme.isDefault) {
          const currentDefault = await db.themes.filter(theme => theme.isDefault === true).first();
          if (currentDefault && currentDefault.id !== updatedTheme.id) {
            await db.themes.update(currentDefault.id, { isDefault: false });
            await syncService.addToQueue({ entity: 'theme', operation: 'update', data: { ...currentDefault, isDefault: false } });
          }
        }
        await db.themes.put(updatedTheme);
        await syncService.addToQueue({ entity: 'theme', operation: 'update', data: updatedTheme });
      });
    } catch (e) {
      console.error("Failed to update theme in Dexie:", e);
      throw e;
    }
  };
  
  const deleteTheme = async (id: string) => {
    await db.themes.delete(id);
    await syncService.addToQueue({ entity: 'theme', operation: 'delete', data: { id } });
  };

  return { themes: themes || [], isLoading, refetch: populateInitialData, addTheme, updateTheme, deleteTheme };
}
