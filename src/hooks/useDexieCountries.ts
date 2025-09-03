

// src/hooks/useDexieCountries.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Country } from '@/types';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export function useDexieCountries() {
  const countries = useLiveQuery(() => db.countries.toArray(), []);
  const isLoading = countries === undefined;

  const addCountry = async (newCountry: Omit<Country, 'id'>) => {
    const tempId = generateId();
    const now = new Date().toISOString();
    const countryWithId: Country = {
      ...newCountry,
      id: tempId,
      createdAt: now,
      updatedAt: now,
    };
    await db.countries.add(countryWithId);
    await syncService.addToQueue({ entity: 'country', operation: 'create', data: countryWithId });
  };

  const updateCountry = async (updatedCountry: Country) => {
    const countryToUpdate = { ...updatedCountry, updatedAt: new Date().toISOString() };
    if (updatedCountry.isDefault) {
      const oldDefault = await db.countries.filter(c => c.isDefault === true).first();
      if (oldDefault && oldDefault.id !== updatedCountry.id) {
        await db.countries.update(oldDefault.id, { isDefault: false });
        await syncService.addToQueue({ entity: 'country', operation: 'update', data: { ...oldDefault, isDefault: false, updatedAt: new Date().toISOString() } });
      }
    }
    await db.countries.put(countryToUpdate);
    await syncService.addToQueue({ entity: 'country', operation: 'update', data: countryToUpdate });
  };

  const deleteCountry = async (id: string) => {
    await db.countries.delete(id);
    await syncService.addToQueue({ entity: 'country', operation: 'delete', data: { id } });
  };

  return { countries: countries || [], isLoading, addCountry, updateCountry, deleteCountry };
}
