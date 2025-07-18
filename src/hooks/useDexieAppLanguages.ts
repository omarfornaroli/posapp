
// src/hooks/useDexieAppLanguages.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { AppLanguage } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const generateId = () => `temp-${crypto.randomUUID()}`;
let isPopulating = false;

export function useDexieAppLanguages() {
  const [isLoading, setIsLoading] = useState(true);

  const appLanguages = useLiveQuery(() => db.appLanguages.toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const count = await db.appLanguages.count();
    if (count > 0) {
      setIsLoading(false);
      return;
    }

    isPopulating = true;
    setIsLoading(true);
    try {
      const response = await fetch('/api/languages');
      if (!response.ok) throw new Error('Failed to fetch initial app languages');
      const result = await response.json();
      if (result.success) {
        await db.appLanguages.bulkAdd(result.data);
      } else {
        throw new Error(result.error || 'API error fetching initial app languages');
      }
    } catch (error) {
      console.warn("[useDexieAppLanguages] Failed to populate initial data (likely offline):", error);
    } finally {
      setIsLoading(false);
      isPopulating = false;
    }
  }, []);

  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  const addLanguage = async (newLang: Omit<AppLanguage, 'id'>) => {
    const tempId = generateId();
    const langWithId: AppLanguage = {
      ...newLang,
      id: tempId,
    };
    await db.appLanguages.add(langWithId);
    await syncService.addToQueue({ entity: 'appLanguage', operation: 'create', data: langWithId });
  };

  const updateLanguage = async (updatedLang: AppLanguage) => {
    // If setting a new default, unset the old one locally first.
    if (updatedLang.isDefault) {
        const oldDefault = await db.appLanguages.filter(lang => lang.isDefault).first();
        if (oldDefault && oldDefault.id !== updatedLang.id) {
            await db.appLanguages.update(oldDefault.id, { isDefault: false });
        }
    }
    await db.appLanguages.put(updatedLang);
    await syncService.addToQueue({ entity: 'appLanguage', operation: 'update', data: updatedLang });
  };

  const deleteLanguage = async (id: string) => {
    await db.appLanguages.delete(id);
    await syncService.addToQueue({ entity: 'appLanguage', operation: 'delete', data: { id } });
  };

  return { appLanguages: appLanguages || [], isLoading: isLoading || appLanguages === undefined, refetch: populateInitialData, addLanguage, updateLanguage, deleteLanguage };
}
