// src/hooks/useDexieCurrencies.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Currency } from '@/types';
import { getApiPath } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
let isPopulating = false;

export function useDexieCurrencies() {
  const [isLoading, setIsLoading] = useState(true);
  const currencies = useLiveQuery(() => db.currencies.orderBy('name').toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const count = await db.currencies.count();
    if (count > 0) {
      setIsLoading(false);
      return;
    }
    
    isPopulating = true;
    setIsLoading(true);
    try {
        const response = await fetch(getApiPath('/api/currencies'));
        if (!response.ok) throw new Error('Failed to fetch initial currencies');
        const result = await response.json();
        if (result.success) {
            await db.currencies.bulkPut(result.data);
        } else {
            throw new Error(result.error || 'API error fetching currencies');
        }
    } catch (error) {
        console.error("[useDexieCurrencies] Failed to populate initial data:", error);
    } finally {
        setIsLoading(false);
        isPopulating = false;
    }
  }, []);

  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  const addCurrency = async (newCurrency: Omit<Currency, 'id' | 'createdAt' | 'updatedAt'>) => {
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

  return { currencies: currencies || [], isLoading: isLoading || currencies === undefined, addCurrency, updateCurrency, deleteCurrency };
}