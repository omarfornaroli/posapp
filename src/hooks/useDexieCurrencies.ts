
// src/hooks/useDexieCurrencies.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Currency } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
let isPopulating = false;

export function useDexieCurrencies() {
  const [isLoading, setIsLoading] = useState(true);

  const currencies = useLiveQuery(() => db.currencies.orderBy('name').toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const shouldFetch = navigator.onLine;

    if (shouldFetch) {
        isPopulating = true;
        setIsLoading(true);
        try {
            const response = await fetch('/api/currencies');
            if (!response.ok) throw new Error('Failed to fetch initial currencies');
            const result = await response.json();
            if (result.success) {
                const serverData: Currency[] = result.data;
                await db.transaction('rw', db.currencies, async () => {
                    const localData = await db.currencies.toArray();
                    const localDataMap = new Map(localData.map(item => [item.id, item]));
                    const dataToUpdate: Currency[] = [];

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
                        await db.currencies.bulkPut(dataToUpdate);
                        console.log(`[useDexieCurrencies] Synced ${dataToUpdate.length} currencies from server.`);
                    }
                });
            } else {
                throw new Error(result.error || 'API error fetching initial currencies');
            }
        } catch (error) {
            console.warn("[useDexieCurrencies] Failed to populate initial data (likely offline):", error);
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

  const addCurrency = async (newCurrency: Omit<Currency, 'id'>) => {
    const tempId = generateId();
    const now = new Date().toISOString();
    const currencyWithId: Currency = {
      ...newCurrency,
      id: tempId,
      createdAt: now,
      updatedAt: now,
    };
    await db.currencies.add(currencyWithId);
    await syncService.addToQueue({ entity: 'currency', operation: 'create', data: currencyWithId });
  };

  const updateCurrency = async (updatedCurrency: Currency) => {
    const currencyToUpdate = { ...updatedCurrency, updatedAt: new Date().toISOString() };
    if (updatedCurrency.isDefault) {
      const oldDefault = await db.currencies.filter(c => c.isDefault === true).first();
      if (oldDefault && oldDefault.id !== updatedCurrency.id) {
        await db.currencies.update(oldDefault.id, { isDefault: false });
        await syncService.addToQueue({ entity: 'currency', operation: 'update', data: { ...oldDefault, isDefault: false, updatedAt: new Date().toISOString() } });
      }
    }
    await db.currencies.put(currencyToUpdate);
    await syncService.addToQueue({ entity: 'currency', operation: 'update', data: currencyToUpdate });
  };

  const deleteCurrency = async (id: string) => {
    await db.currencies.delete(id);
    await syncService.addToQueue({ entity: 'currency', operation: 'delete', data: { id } });
  };

  return { currencies: currencies || [], isLoading: isLoading || currencies === undefined, refetch: populateInitialData, addCurrency, updateCurrency, deleteCurrency };
}
