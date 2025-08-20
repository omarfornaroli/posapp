
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
      
      await db.transaction('rw', db.themes, async () => {
        const currentLocalThemes = await db.themes.toArray();
        if (JSON.stringify(serverThemes) !== JSON.stringify(currentLocalThemes)) {
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
        await db.transaction('rw', db.themes, async () => {
            if (updatedTheme.isDefault) {
                // Find and unset the current default theme
                const currentDefault = await db.themes.where('isDefault').equals(1).first();
                if (currentDefault && currentDefault.id !== updatedTheme.id) {
                    await db.themes.update(currentDefault.id, { isDefault: false });
                    await syncService.addToQueue({ entity: 'theme', operation: 'update', data: { ...currentDefault, isDefault: false }});
                }
            }
            // Put the updated theme (which will either be the new default or just a regular update)
            await db.themes.put(updatedTheme);
        });
        // Queue the primary update operation after the transaction completes
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

  return { themes: themes || [], isLoading: isLoading && (!themes || themes.length === 0), refetch: populateInitialData, addTheme, updateTheme, deleteTheme };
}
