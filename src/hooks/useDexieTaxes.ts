
// src/hooks/useDexieTaxes.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Tax } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
let isPopulating = false;

export function useDexieTaxes() {
  const [isLoading, setIsLoading] = useState(true);

  const taxes = useLiveQuery(() => db.taxes.toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const shouldFetch = navigator.onLine;

    if (shouldFetch) {
        isPopulating = true;
        setIsLoading(true);
        try {
            const response = await fetch('/api/taxes');
            if (!response.ok) throw new Error('Failed to fetch initial taxes');
            const result = await response.json();
            if (result.success) {
                const serverData: Tax[] = result.data;
                await db.transaction('rw', db.taxes, async () => {
                    const localData = await db.taxes.toArray();
                    const localDataMap = new Map(localData.map(item => [item.id, item]));
                    const dataToUpdate: Tax[] = [];

                    for(const serverItem of serverData) {
                        const localItem = localDataMap.get(serverItem.id);
                        if (!localItem) {
                            dataToUpdate.push(serverItem);
                        } else {
                            const localUpdatedAt = new Date(localItem.updatedAt || 0).getTime();
                            const serverUpdatedAt = new Date(serverItem.updatedAt || 0).getTime();
                            if (serverUpdatedAt > localUpdatedAt) {
                                dataToUpdate.push(serverItem);
                            }
                        }
                    }
                    if (dataToUpdate.length > 0) {
                        await db.taxes.bulkPut(dataToUpdate);
                        console.log(`[useDexieTaxes] Synced ${dataToUpdate.length} taxes from server.`);
                    }
                });
            } else {
                throw new Error(result.error || 'API error fetching initial taxes');
            }
        } catch (error) {
            console.warn("[useDexieTaxes] Failed to populate initial data (likely offline):", error);
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

  const addTax = async (newTax: Omit<Tax, 'id'>) => {
    const tempId = generateId();
    const now = new Date().toISOString();
    const taxWithId: Tax = {
      ...newTax,
      id: tempId,
      createdAt: now,
      updatedAt: now,
    };
    await db.taxes.add(taxWithId);
    await syncService.addToQueue({ entity: 'tax', operation: 'create', data: taxWithId });
  };

  const updateTax = async (updatedTax: Tax) => {
    const taxToUpdate = { ...updatedTax, updatedAt: new Date().toISOString() };
    await db.taxes.put(taxToUpdate);
    await syncService.addToQueue({ entity: 'tax', operation: 'update', data: taxToUpdate });
  };

  const deleteTax = async (id: string) => {
    await db.taxes.delete(id);
    await syncService.addToQueue({ entity: 'tax', operation: 'delete', data: { id } });
  };

  return { taxes: taxes || [], isLoading: isLoading || taxes === undefined, refetch: populateInitialData, addTax, updateTax, deleteTax };
}
