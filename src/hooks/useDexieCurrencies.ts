
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

  const currencies = useLiveQuery(() => db.currencies.toArray(), []);

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
                await db.currencies.bulkPut(result.data);
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
    const currencyWithId: Currency = {
      ...newCurrency,
      id: tempId,
    };
    await db.currencies.add(currencyWithId);
    await syncService.addToQueue({ entity: 'currency', operation: 'create', data: currencyWithId });
  };

  const updateCurrency = async (updatedCurrency: Currency) => {
    if (updatedCurrency.isDefault) {
      const oldDefault = await db.currencies.filter(c => c.isDefault === true).first();
      if (oldDefault && oldDefault.id !== updatedCurrency.id) {
        await db.currencies.update(oldDefault.id, { isDefault: false });
        await syncService.addToQueue({ entity: 'currency', operation: 'update', data: { ...oldDefault, isDefault: false } });
      }
    }
    await db.currencies.put(updatedCurrency);
    await syncService.addToQueue({ entity: 'currency', operation: 'update', data: updatedCurrency });
  };

  const deleteCurrency = async (id: string) => {
    await db.currencies.delete(id);
    await syncService.addToQueue({ entity: 'currency', operation: 'delete', data: { id } });
  };

  return { currencies: currencies || [], isLoading: isLoading || currencies === undefined, refetch: populateInitialData, addCurrency, updateCurrency, deleteCurrency };
}
