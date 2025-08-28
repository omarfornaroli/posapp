
// src/hooks/useDexieCountries.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Country } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
let isPopulating = false;

export function useDexieCountries() {
  const [isLoading, setIsLoading] = useState(true);

  const countries = useLiveQuery(() => db.countries.toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;
    
    const shouldFetch = navigator.onLine;

    if (shouldFetch) {
        isPopulating = true;
        setIsLoading(true);
        try {
            const response = await fetch('/api/countries');
            if (!response.ok) throw new Error('Failed to fetch initial countries');
            const result = await response.json();
            if (result.success) {
                await db.countries.bulkPut(result.data);
            } else {
                throw new Error(result.error || 'API error fetching initial countries');
            }
        } catch (error) {
            console.warn("[useDexieCountries] Failed to populate initial data (likely offline):", error);
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

  const addCountry = async (newCountry: Omit<Country, 'id'>) => {
    const tempId = generateId();
    const countryWithId: Country = {
      ...newCountry,
      id: tempId,
    };
    await db.countries.add(countryWithId);
    await syncService.addToQueue({ entity: 'country', operation: 'create', data: countryWithId });
  };

  const updateCountry = async (updatedCountry: Country) => {
    if (updatedCountry.isDefault) {
      const oldDefault = await db.countries.filter(c => c.isDefault === true).first();
      if (oldDefault && oldDefault.id !== updatedCountry.id) {
        await db.countries.update(oldDefault.id, { isDefault: false });
        await syncService.addToQueue({ entity: 'country', operation: 'update', data: { ...oldDefault, isDefault: false } });
      }
    }
    await db.countries.put(updatedCountry);
    await syncService.addToQueue({ entity: 'country', operation: 'update', data: updatedCountry });
  };

  const deleteCountry = async (id: string) => {
    await db.countries.delete(id);
    await syncService.addToQueue({ entity: 'country', operation: 'delete', data: { id } });
  };

  return { countries: countries || [], isLoading: isLoading || countries === undefined, refetch: populateInitialData, addCountry, updateCountry, deleteCountry };
}
