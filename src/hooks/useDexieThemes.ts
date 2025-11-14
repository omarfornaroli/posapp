// src/hooks/useDexieThemes.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Theme } from '@/types';
import { getApiPath } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
let isPopulating = false;

export function useDexieThemes() {
  const [isLoading, setIsLoading] = useState(true);
  const themes = useLiveQuery(() => db.themes.orderBy('name').toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const count = await db.themes.count();
    if (count > 0) {
      setIsLoading(false);
      return;
    }
    
    isPopulating = true;
    setIsLoading(true);
    try {
        const response = await fetch(getApiPath('/api/themes'));
        if (!response.ok) throw new Error('Failed to fetch initial themes');
        const result = await response.json();
        if (result.success) {
            await db.themes.bulkPut(result.data);
        } else {
            throw new Error(result.error || 'API error fetching themes');
        }
    } catch (error) {
        console.error("[useDexieThemes] Failed to populate initial data:", error);
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

  return { themes: themes || [], isLoading: isLoading || themes === undefined, addTheme, updateTheme, deleteTheme };
}