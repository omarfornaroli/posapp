

// src/hooks/useDexieReports.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import type { Report } from '@/types';

export function useDexieReports() {
  const reports = useLiveQuery(() => db.reports.orderBy('createdAt').reverse().toArray(), []);
  const isLoading = reports === undefined;

  // The refetch logic here will be handled by the global sync service, 
  // keeping this hook simple and focused on providing live data.

  return { reports: reports || [], isLoading };
}
