
// src/hooks/useDexieCurrencies.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Currency } from '@/types';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export function useDexieCurrencies() {
  const currencies = useLiveQuery(() => db.currencies.orderBy('name').toArray(), []);
  const isLoading = currencies === undefined;

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

  return { currencies: currencies || [], isLoading, addCurrency, updateCurrency, deleteCurrency };
}
