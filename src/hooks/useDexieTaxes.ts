

// src/hooks/useDexieTaxes.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Tax } from '@/types';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export function useDexieTaxes() {
  const taxes = useLiveQuery(() => db.taxes.toArray(), []);
  const isLoading = taxes === undefined;

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

  return { taxes: taxes || [], isLoading, addTax, updateTax, deleteTax };
}
