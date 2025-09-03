

// src/hooks/useDexieSales.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';

export function useDexieSales() {
  const sales = useLiveQuery(() => db.sales.orderBy('date').reverse().toArray(), []);
  const isLoading = sales === undefined;
  // Refetch is handled globally.
  return { sales: sales || [], isLoading };
}
