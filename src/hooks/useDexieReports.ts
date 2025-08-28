
// src/hooks/useDexieReports.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import type { Report } from '@/types';
import { useState, useEffect, useCallback } from 'react';

let isPopulating = false;

export function useDexieReports() {
  const [isLoading, setIsLoading] = useState(true);

  const reports = useLiveQuery(() => db.reports.orderBy('createdAt').reverse().toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const shouldFetch = navigator.onLine;

    if (shouldFetch) {
        isPopulating = true;
        setIsLoading(true);
        try {
            const response = await fetch('/api/reports');
            if (!response.ok) throw new Error('Failed to fetch initial reports');
            const result = await response.json();
            if (result.success) {
                await db.reports.bulkPut(result.data);
            } else {
                throw new Error(result.error || 'API error fetching initial reports');
            }
        } catch (error) {
            console.warn("[useDexieReports] Failed to populate initial data (likely offline):", error);
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

  return { reports: reports || [], isLoading: isLoading || reports === undefined, refetch: populateInitialData };
}
