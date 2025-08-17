
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

  const themes = useLiveQuery(() => db.themes.toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    // Check if there are any themes in Dexie. If so, don't block for loading.
    const count = await db.themes.count();
    if (count > 0) {
      setIsLoading(false);
      // Still attempt a background fetch to get latest, but don't set loading state
      try {
        const response = await fetch('/api/themes');
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                await db.themes.bulkPut(result.data);
            }
        }
      } catch (e) {
          console.warn("[useDexieThemes] Background fetch failed, likely offline.", e);
      }
      return;
    }

    isPopulating = true;
    setIsLoading(true);
    try {
      const response = await fetch('/api/themes');
      if (!response.ok) throw new Error('Failed to fetch initial themes');
      const result = await response.json();
      if (result.success) {
        await db.themes.bulkAdd(result.data);
      } else {
        throw new Error(result.error || 'API error fetching initial themes');
      }
    } catch (error) {
      console.warn("[useDexieThemes] Failed to populate initial data (likely offline):", error);
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
      isDefault: false, // New themes are never default initially
    };
    await db.themes.add(themeWithId);
    // Let the API handle creation. No need for a sync queue item for create
    // if the action itself calls the API. This depends on implementation.
    // For simplicity, we assume API call is separate.
  };

  const updateTheme = async (updatedTheme: Theme) => {
     try {
        // If setting a new default, unset the old one locally first.
        if (updatedTheme.isDefault) {
            const oldDefault = await db.themes.filter(t => t.isDefault === true).first();
            if (oldDefault && oldDefault.id !== updatedTheme.id) {
                await db.themes.update(oldDefault.id, { isDefault: false });
                 // Sync the change for the old default theme
                await syncService.addToQueue({ entity: 'theme', operation: 'update', data: { ...oldDefault, isDefault: false } });
            }
        }
        await db.themes.put(updatedTheme);
        // Sync the change for the new default theme
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
