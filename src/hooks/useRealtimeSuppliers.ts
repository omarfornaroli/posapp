
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Supplier } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useRxTranslate } from './use-rx-translate';

const POLLING_INTERVAL = 20000; // 20 seconds

export function useRealtimeSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useRxTranslate();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchData = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad && isMounted.current) {
      setIsLoading(true);
    }
    if (isMounted.current) {
       setError(null);
    }

    try {
      const response = await fetch('/api/suppliers');
      if (!response.ok) {
        throw new Error(t('SuppliersManager.errorFetchingSuppliers') || 'Failed to fetch suppliers');
      }
      const result = await response.json();

      if (isMounted.current) {
        if (result.success) {
          const newData = result.data;
          setSuppliers(prevData => {
            if (JSON.stringify(prevData) !== JSON.stringify(newData)) {
              return newData;
            }
            return prevData;
          });
        } else {
          throw new Error(result.error || (t('SuppliersManager.errorFetchingSuppliers') || 'API error fetching suppliers'));
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : (t('Common.error') || 'Unknown error');
      if (isMounted.current) {
        setError(errorMessage);
        if (isInitialLoad) {
          toast({
            variant: 'destructive',
            title: t('Common.error') || 'Error',
            description: errorMessage,
          });
        }
        console.error("Error in useRealtimeSuppliers:", err);
      }
    } finally {
      if (isInitialLoad && isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [toast, t]);

  useEffect(() => {
    if (isMounted.current) {
        fetchData(true); // Initial fetch
    }

    const intervalId = setInterval(() => {
      if (isMounted.current) {
        fetchData(false); // Subsequent polling fetches
      }
    }, POLLING_INTERVAL);

    return () => {
      clearInterval(intervalId); // Cleanup on unmount
    };
  }, [fetchData]);

  return { suppliers, isLoading, error, refetch: () => fetchData(true) };
}
