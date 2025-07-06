// src/hooks/useDexieSuppliers.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Supplier } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const generateSupplierId = () => `temp-${crypto.randomUUID()}`;
let isPopulating = false;

export function useDexieSuppliers() {
  const [isLoading, setIsLoading] = useState(true);

  const suppliers = useLiveQuery(() => db.suppliers.toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;
    
    const supplierCount = await db.suppliers.count();
    if (supplierCount > 0) {
      setIsLoading(false);
      return;
    }

    isPopulating = true;
    setIsLoading(true);
    try {
      const response = await fetch('/api/suppliers');
      if (!response.ok) throw new Error('Failed to fetch initial suppliers');
      const result = await response.json();
      if (result.success) {
        const currentCount = await db.suppliers.count();
        if (currentCount === 0) {
            await db.suppliers.bulkAdd(result.data);
            console.log(`[useDexieSuppliers] Added ${result.data.length} suppliers to Dexie.`);
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
  }, []);
  
  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  const addSupplier = async (newSupplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => {
    const tempId = generateSupplierId();
    const supplierWithId: Supplier = {
      ...newSupplier,
      id: tempId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      await db.suppliers.put({
          ...updatedSupplier,
          updatedAt: new Date().toISOString(),
      });
      await syncService.addToQueue({ entity: 'supplier', operation: 'update', data: updatedSupplier });
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
