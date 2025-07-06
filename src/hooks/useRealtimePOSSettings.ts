
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { POSSetting } from '@/types';
import { useRxTranslate } from './use-rx-translate';

const POLLING_INTERVAL = 30000; // 30 seconds

export function useRealtimePOSSettings() {
  const [posSettings, setPosSettings] = useState<POSSetting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      const response = await fetch('/api/pos-settings');
      if (!response.ok) {
        throw new Error(t('POSBehaviorSettingsForm.errorFetchingSettings') || 'Failed to fetch POS settings');
      }
      const result = await response.json();

      if (isMounted.current) {
        if (result.success) {
          const newData = result.data;
          setPosSettings(prevData => {
            if (JSON.stringify(prevData) !== JSON.stringify(newData)) {
              return newData;
            }
            return prevData;
          });
        } else {
          throw new Error(result.error || (t('POSBehaviorSettingsForm.errorFetchingSettings') || 'API error fetching POS settings'));
        }
      }
    } catch (err) {
      // Gracefully fail on network error, which is expected offline.
      console.warn(`[useRealtimePOSSettings] Failed to fetch updated data (likely offline):`, err);
    } finally {
      if (isInitialLoad && isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [t]);

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

  return { posSettings, isLoading, error, refetch: () => fetchData(true) };
}
