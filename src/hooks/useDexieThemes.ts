
// src/hooks/useDexieThemes.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Theme } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
let isPopulating = false;

export function useDexieThemes() {
  const [isLoading, setIsLoading] = useState(true);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const shouldFetch = navigator.onLine;

    if (shouldFetch) {
        isPopulating = true;
        // Don't set loading to true here to avoid UI flicker on refetch
        try {
            const response = await fetch('/api/themes');
            if (!response.ok) throw new Error('Failed to fetch themes');
            
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'API error fetching themes');

            const serverThemes: Theme[] = result.data;
            
            await db.transaction('rw', db.themes, async () => {
                const localThemes = await db.themes.toArray();
                const localThemeMap = new Map(localThemes.map(t => [t.id, t]));
                const themesToUpdate: Theme[] = [];

                for (const serverTheme of serverThemes) {
                    const localTheme = localThemeMap.get(serverTheme.id);
                    if (!localTheme) {
                        themesToUpdate.push(serverTheme);
                    } else {
                        const localUpdatedAt = new Date(localTheme.updatedAt || 0).getTime();
                        const serverUpdatedAt = new Date(serverTheme.updatedAt || 0).getTime();
                        if (serverUpdatedAt > localUpdatedAt) {
                            themesToUpdate.push(serverTheme);
                        }
                    }
                }

                if (themesToUpdate.length > 0) {
                    await db.themes.bulkPut(themesToUpdate);
                    console.log(`[useDexieThemes] Synced ${themesToUpdate.length} themes from server.`);
                }
            });
            
        } catch (error) {
            console.warn("[useDexieThemes] Failed to populate themes (likely offline). Using local data.", error);
        } finally {
            isPopulating = false;
        }
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    populateInitialData().finally(() => setIsLoading(false));
  }, [populateInitialData]);
  
  const themes = useLiveQuery(
    () => db.themes.orderBy('name').toArray(), 
    [], 
    []
  );

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
            await syncService.addToQueue({ entity: 'theme', operation: 'update', data: { ...currentDefault, isDefault: false, updatedAt: new Date().toISOString() } });
          }
        }
        const themeToUpdate = { ...updatedTheme, updatedAt: new Date().toISOString() };
        await db.themes.put(themeToUpdate);
        await syncService.addToQueue({ entity: 'theme', operation: 'update', data: themeToUpdate });
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

  return { themes: themes || [], isLoading: isLoading || themes === undefined, refetch: populateInitialData, addTheme, updateTheme, deleteTheme };
}
