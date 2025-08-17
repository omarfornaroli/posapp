
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
    isPopulating = true;
    setIsLoading(true);

    try {
      const response = await fetch('/api/themes');
      if (!response.ok) throw new Error('Failed to fetch themes');
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'API error fetching themes');

      const serverThemes: Theme[] = result.data;
      const localThemes = await db.themes.toArray();

      const serverIds = new Set(serverThemes.map(t => t.id));
      
      // Add or update themes from the server
      await db.themes.bulkPut(serverThemes);

      // Remove local themes that are no longer on the server (and are not temp)
      const themesToDelete = localThemes.filter(lt => !lt.id.startsWith('temp-') && !serverIds.has(lt.id)).map(lt => lt.id);
      if (themesToDelete.length > 0) {
        await db.themes.bulkDelete(themesToDelete);
      }

    } catch (error) {
      console.warn("[useDexieThemes] Failed to populate themes (likely offline):", error);
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
    // Let the API handle creation. No need for a sync queue item for create.
    // The server will assign a permanent ID, which will be synced back.
    const response = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTheme),
    });
    const result = await response.json();
    if (result.success) {
        // Replace temp record with the one from the server
        await db.transaction('rw', db.themes, async () => {
            await db.themes.delete(tempId);
            await db.themes.put(result.data);
        });
    } else {
       console.error("Failed to save new theme to server:", result.error);
       // The theme remains in Dexie with a temp ID and will need a more robust sync/retry strategy
       // For now, we leave it for the user to potentially try again.
       throw new Error(result.error);
    }
  };

  const updateTheme = async (updatedTheme: Theme) => {
     try {
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

  return { themes: themes || [], isLoading: isLoading || themes === undefined, refetch: populateInitialData, addTheme, updateTheme, deleteTheme };
}
