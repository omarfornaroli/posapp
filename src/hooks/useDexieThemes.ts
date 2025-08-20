
// src/hooks/useDexieThemes.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Theme } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const generateId = () => `temp-${crypto.randomUUID()}`;
let isPopulating = false;

export function useDexieThemes() {
  const [isLoading, setIsLoading] = useState(true);
  const themes = useLiveQuery(() => db.themes.orderBy('name').toArray(), []);
  
  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;
    
    setIsLoading(true);
    isPopulating = true;
    
    try {
      const response = await fetch('/api/themes');
      if (!response.ok) throw new Error('Failed to fetch themes');
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'API error fetching themes');

      const serverThemes: Theme[] = result.data;
      
      // Perform a clean sync: clear local and add server data.
      await db.transaction('rw', db.themes, async () => {
        const localThemes = await db.themes.toArray();
        // A simple check to see if a sync is needed
        if(serverThemes.length !== localThemes.length || JSON.stringify(serverThemes) !== JSON.stringify(localThemes)){
            await db.themes.clear();
            await db.themes.bulkAdd(serverThemes);
        }
      });
      
    } catch (error) {
      console.warn("[useDexieThemes] Failed to populate themes (likely offline). Using local data.", error);
    } finally {
      setIsLoading(false);
      isPopulating = false;
    }
  }, []);

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
        // If the incoming update sets a theme to be the default
        if (updatedTheme.isDefault) {
          // Find the current default theme
          const currentDefault = await db.themes.where('isDefault').equals(1).first();
          if (currentDefault && currentDefault.id !== updatedTheme.id) {
            // Unset the old default
            await db.themes.update(currentDefault.id, { isDefault: false });
            // Queue the update for the old default theme for sync
            await syncService.addToQueue({ entity: 'theme', operation: 'update', data: { ...currentDefault, isDefault: false } });
          }
        }
        // Update the new theme (either setting it as default or just updating other properties)
        await db.themes.put(updatedTheme);
      });

      // Queue the primary update operation after the transaction completes successfully
      await syncService.addToQueue({ entity: 'theme', operation: 'update', data: updatedTheme });

    } catch (e) {
      console.error("Failed to update theme in Dexie:", e);
      throw e; // Re-throw to allow the UI to catch it
    }
  };
  
  const deleteTheme = async (id: string) => {
    await db.themes.delete(id);
    await syncService.addToQueue({ entity: 'theme', operation: 'delete', data: { id } });
  };

  return { themes: themes || [], isLoading: isLoading && (!themes || themes.length === 0), refetch: populateInitialData, addTheme, updateTheme, deleteTheme };
}
