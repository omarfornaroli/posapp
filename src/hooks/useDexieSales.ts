
// src/hooks/useDexieSales.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import type { SaleTransaction } from '@/types';
import { useState, useEffect, useCallback } from 'react';

let isPopulating = false;

export function useDexieSales() {
  const [isLoading, setIsLoading] = useState(true);

  const sales = useLiveQuery(() => db.sales.orderBy('date').reverse().toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const shouldFetch = navigator.onLine;

    if (shouldFetch) {
        isPopulating = true;
        setIsLoading(true);
        try {
            const response = await fetch('/api/sales');
            if (!response.ok) throw new Error('Failed to fetch initial sales');
            const result = await response.json();
            if (result.success) {
                await db.sales.bulkPut(result.data);
            } else {
                throw new Error(result.error || 'API error fetching initial sales');
            }
        } catch (error) {
            console.warn("[useDexieSales] Failed to populate initial data (likely offline):", error);
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

  return { sales: sales || [], isLoading: isLoading || sales === undefined, refetch: populateInitialData };
}
