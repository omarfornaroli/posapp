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

    const count = await db.themes.count();
    if (count > 0) {
      setIsLoading(false);
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

  const addTheme = async (newTheme: Omit<Theme, 'id' | 'createdAt' | 'updatedAt' | 'isDefault'>) => {
    const tempId = generateId();
    const themeWithId: Theme = {
      ...newTheme,
      id: tempId,
      isDefault: false, // New themes are never default initially
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.themes.add(themeWithId);
    await syncService.addToQueue({ entity: 'theme', operation: 'create', data: themeWithId });
  };

  const updateTheme = async (updatedTheme: Theme) => {
    // If setting a new default, unset the old one locally first.
    if (updatedTheme.isDefault) {
        const oldDefault = await db.themes.where('isDefault').equals(true).first();
        if (oldDefault && oldDefault.id !== updatedTheme.id) {
            await db.themes.update(oldDefault.id, { isDefault: false });
            await syncService.addToQueue({ entity: 'theme', operation: 'update', data: { ...oldDefault, isDefault: false } });
        }
    }
    await db.themes.put({ ...updatedTheme, updatedAt: new Date().toISOString() });
    await syncService.addToQueue({ entity: 'theme', operation: 'update', data: updatedTheme });
  };
  
  const deleteTheme = async (id: string) => {
    await db.themes.delete(id);
    await syncService.addToQueue({ entity: 'theme', operation: 'delete', data: { id } });
  };

  return { themes: themes || [], isLoading: isLoading || themes === undefined, refetch: populateInitialData, addTheme, updateTheme, deleteTheme };
}
