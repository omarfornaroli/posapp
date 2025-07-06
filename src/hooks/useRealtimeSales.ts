// src/hooks/useRealtimeSales.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import type { SaleTransaction } from '@/types';
import { useState, useEffect, useCallback, useRef } from 'react';

const POLLING_INTERVAL = 20000; // 20 seconds
let isPopulating = false;

export function useRealtimeSales() {
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  const sales = useLiveQuery(() => db.sales.orderBy('date').reverse().toArray(), []);

  const populateAndPoll = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad && isMounted.current) {
        setIsLoading(true);
    }

    if (isPopulating) {
      if (isInitialLoad && isMounted.current) setIsLoading(false);
      return;
    }
    isPopulating = true;
    
    try {
      const response = await fetch('/api/sales');
      if (!response.ok) throw new Error('Failed to fetch sales');
      const result = await response.json();
      if (result.success) {
        await db.sales.bulkPut(result.data);
      } else {
        throw new Error(result.error || 'API error fetching sales');
      }
    } catch (error) {
      console.warn("[useRealtimeSales] Failed to populate/poll sales (likely offline):", error);
    } finally {
      if (isMounted.current) setIsLoading(false);
      isPopulating = false;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    populateAndPoll(true);
    const intervalId = setInterval(() => populateAndPoll(false), POLLING_INTERVAL);
    return () => {
      isMounted.current = false;
      clearInterval(intervalId);
    };
  }, [populateAndPoll]);

  return { sales: sales || [], isLoading: isLoading || sales === undefined, refetch: () => populateAndPoll(true) };
}
