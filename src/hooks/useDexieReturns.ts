
// src/hooks/useDexieReturns.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import type { Return as ReturnType } from '@/types';
import { useState, useEffect, useCallback } from 'react';

let isPopulating = false;

export function useDexieReturns() {
  const [isLoading, setIsLoading] = useState(true);

  const returns = useLiveQuery(() => db.returns.toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const shouldFetch = navigator.onLine;

    if (shouldFetch) {
      isPopulating = true;
      setIsLoading(true);
      try {
        const response = await fetch('/api/returns');
        if (!response.ok) throw new Error('Failed to fetch initial returns');
        const result = await response.json();
        if (result.success) {
          await db.returns.bulkPut(result.data);
          console.log(`[useDexieReturns] Synced ${result.data.length} returns from server.`);
        } else {
          throw new Error(result.error || 'API error fetching initial returns');
        }
      } catch (error) {
        console.warn("[useDexieReturns] Failed to populate initial data (likely offline):", error);
      } finally {
        setIsLoading(false);
        isPopulating = false;
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);
  
  return { returns: returns || [], isLoading: isLoading || returns === undefined, refetch: populateInitialData };
}
