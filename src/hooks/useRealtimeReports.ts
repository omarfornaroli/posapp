
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import type { Report } from '@/types';
import { useRxTranslate } from './use-rx-translate';

const POLLING_INTERVAL = 30000; // 30 seconds
let isPopulating = false;

export function useRealtimeReports() {
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);
  const { t } = useRxTranslate();

  const reports = useLiveQuery(() => db.reports.orderBy('createdAt').reverse().toArray(), []);

  const populateAndPoll = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
        if (isMounted.current) setIsLoading(true);
    }

    if (isPopulating) {
        if (isInitialLoad && isMounted.current) setIsLoading(false);
        return;
    }
    isPopulating = true;
    
    try {
      const response = await fetch('/api/reports');
      if (!response.ok) {
        throw new Error(t('ReportsPage.errorFetching') || 'Failed to fetch reports');
      }
      const result = await response.json();
      if (result.success) {
        await db.reports.bulkPut(result.data);
      } else {
        throw new Error(result.error || (t('ReportsPage.errorFetching') || 'API error fetching reports'));
      }
    } catch (err) {
      // Gracefully fail on network error, which is expected offline.
      console.warn(`[useRealtimeReports] Failed to fetch updated data (likely offline):`, err);
    } finally {
      if (isMounted.current) setIsLoading(false);
      isPopulating = false;
    }
  }, [t]);

  useEffect(() => {
    isMounted.current = true;
    populateAndPoll(true);
    const intervalId = setInterval(() => populateAndPoll(false), POLLING_INTERVAL);

    return () => {
      isMounted.current = false;
      clearInterval(intervalId);
    };
  }, [populateAndPoll]);

  return { reports: reports || [], isLoading: isLoading || reports === undefined, refetch: () => populateAndPoll(true) };
}
