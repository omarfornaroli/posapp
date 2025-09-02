
// src/hooks/useDexieSuppliers.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Supplier } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
let isPopulating = false;

export function useDexieSuppliers() {
  const [isLoading, setIsLoading] = useState(true);

  const suppliers = useLiveQuery(() => db.suppliers.toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;
    
    const shouldFetch = navigator.onLine;

    if (shouldFetch) {
        isPopulating = true;
        setIsLoading(true);
        try {
            const response = await fetch('/api/suppliers');
            if (!response.ok) throw new Error('Failed to fetch initial suppliers');
            const result = await response.json();
            if (result.success) {
                const serverSuppliers: Supplier[] = result.data;
                const localSuppliers = await db.suppliers.toArray();
                const localSupplierMap = new Map(localSuppliers.map(s => [s.id, s]));

                const suppliersToUpdate: Supplier[] = [];
                const conflicts: { local: Supplier, server: Supplier }[] = [];

                for (const serverSupplier of serverSuppliers) {
                    const localSupplier = localSupplierMap.get(serverSupplier.id);
                    if (localSupplier) {
                        const localUpdatedAt = new Date(localSupplier.updatedAt || 0).getTime();
                        const serverUpdatedAt = new Date(serverSupplier.updatedAt || 0).getTime();
                        const localCreatedAt = new Date(localSupplier.createdAt || 0).getTime();

                        if (serverUpdatedAt > localUpdatedAt && localUpdatedAt === localCreatedAt) {
                            suppliersToUpdate.push(serverSupplier);
                        } else if (serverUpdatedAt > localUpdatedAt && localUpdatedAt > localCreatedAt) {
                             conflicts.push({ local: localSupplier, server: serverSupplier });
                             console.warn(`Conflict detected for Supplier ${serverSupplier.id}. Local changes will be kept for now.`);
                        }
                    } else {
                        suppliersToUpdate.push(serverSupplier);
                    }
                }

                if (suppliersToUpdate.length > 0) {
                    await db.suppliers.bulkPut(suppliersToUpdate);
                    console.log(`[useDexieSuppliers] Automatically synced ${suppliersToUpdate.length} suppliers from server.`);
                }
                if (conflicts.length > 0) {
                    // This is where a conflict resolution UI would be triggered
                    console.log("Unhandled supplier conflicts:", conflicts);
                }

            } else {
                throw new Error(result.error || 'API error fetching initial suppliers');
            }
        } catch (error) {
            console.warn("[useDexieSuppliers] Failed to populate initial data (likely offline):", error);
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

  const addSupplier = async (newSupplier: Omit<Supplier, 'id'| 'createdAt' | 'updatedAt'>) => {
    const tempId = generateId();
    const now = new Date().toISOString();
    const supplierWithId: Supplier = {
      ...newSupplier,
      id: tempId,
      createdAt: now,
      updatedAt: now,
    };
    
    try {
      await db.suppliers.add(supplierWithId);
      await syncService.addToQueue({ entity: 'supplier', operation: 'create', data: supplierWithId });
    } catch (error) {
      console.error("Failed to add supplier to Dexie:", error);
      throw error;
    }
  };

  const updateSupplier = async (updatedSupplier: Supplier) => {
     try {
      const supplierToUpdate = { ...updatedSupplier, updatedAt: new Date().toISOString() };
      await db.suppliers.put(supplierToUpdate);
      await syncService.addToQueue({ entity: 'supplier', operation: 'update', data: supplierToUpdate });
    } catch (error) {
      console.error("Failed to update supplier in Dexie:", error);
      throw error;
    }
  };

  const deleteSupplier = async (supplierId: string) => {
    try {
      await db.suppliers.delete(supplierId);
      await syncService.addToQueue({ entity: 'supplier', operation: 'delete', data: { id: supplierId } });
    } catch (error) {
      console.error("Failed to delete supplier from Dexie:", error);
      throw error;
    }
  };
  
  return { suppliers: suppliers || [], isLoading: isLoading || suppliers === undefined, refetch: populateInitialData, addSupplier, updateSupplier, deleteSupplier };
}
