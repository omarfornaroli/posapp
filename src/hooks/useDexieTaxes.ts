
// src/hooks/useDexieTaxes.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Tax } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const generateId = () => `temp-${crypto.randomUUID()}`;
let isPopulating = false;

export function useDexieTaxes() {
  const [isLoading, setIsLoading] = useState(true);

  const taxes = useLiveQuery(() => db.taxes.toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const count = await db.taxes.count();
    if (count > 0) {
      setIsLoading(false);
      return;
    }

    isPopulating = true;
    setIsLoading(true);
    try {
      const response = await fetch('/api/taxes');
      if (!response.ok) throw new Error('Failed to fetch initial taxes');
      const result = await response.json();
      if (result.success) {
        await db.taxes.bulkAdd(result.data);
      } else {
        throw new Error(result.error || 'API error fetching initial taxes');
      }
    } catch (error) {
      console.warn("[useDexieTaxes] Failed to populate initial data (likely offline):", error);
    } finally {
      setIsLoading(false);
      isPopulating = false;
    }
  }, []);

  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  const addTax = async (newTax: Omit<Tax, 'id'>) => {
    const tempId = generateId();
    const taxWithId: Tax = {
      ...newTax,
      id: tempId,
    };
    await db.taxes.add(taxWithId);
    await syncService.addToQueue({ entity: 'tax', operation: 'create', data: taxWithId });
  };

  const updateTax = async (updatedTax: Tax) => {
    await db.taxes.put(updatedTax);
    await syncService.addToQueue({ entity: 'tax', operation: 'update', data: updatedTax });
  };

  const deleteTax = async (id: string) => {
    await db.taxes.delete(id);
    await syncService.addToQueue({ entity: 'tax', operation: 'delete', data: { id } });
  };

  return { taxes: taxes || [], isLoading: isLoading || taxes === undefined, refetch: populateInitialData, addTax, updateTax, deleteTax };
}
