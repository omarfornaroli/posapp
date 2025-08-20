
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
    setIsLoading(true);
    try {
      const response = await fetch('/api/themes');
      if (!response.ok) throw new Error('Failed to fetch themes');
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'API error fetching themes');

      const serverThemes: Theme[] = result.data;
      
      // Atomically clear and bulk-add to prevent duplicates and ensure consistency.
      await db.transaction('rw', db.themes, async () => {
        await db.themes.clear();
        await db.themes.bulkAdd(serverThemes);
      });
      
    } catch (error) {
      console.warn("[useDexieThemes] Failed to populate themes (likely offline). Using local data.", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Live query will react to any changes in the themes table.
  const themes = useLiveQuery(
    () => {
      // Set loading to false once we have some data from Dexie.
      db.themes.count().then(count => {
        if (count > 0 && isLoading) {
            setIsLoading(false);
        }
      });
      return db.themes.orderBy('name').toArray();
    }, 
    [], // dependencies for the query
    []  // Default value
  );

  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

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
          const currentDefault = await db.themes.where({ isDefault: true }).first();
          if (currentDefault && currentDefault.id !== updatedTheme.id) {
            await db.themes.update(currentDefault.id, { isDefault: false });
            // Queue the update for the old default
            await syncService.addToQueue({ entity: 'theme', operation: 'update', data: { ...currentDefault, isDefault: false } });
          }
        }
        await db.themes.put(updatedTheme);
      });
      // Queue the update for the new theme
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

  return { themes: themes || [], isLoading, refetch: populateInitialData, addTheme, updateTheme, deleteTheme };
}
