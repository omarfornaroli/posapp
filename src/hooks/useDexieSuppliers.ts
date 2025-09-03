

// src/hooks/useDexieSuppliers.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Supplier } from '@/types';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export function useDexieSuppliers() {
  const suppliers = useLiveQuery(() => db.suppliers.toArray(), []);
  const isLoading = suppliers === undefined;

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
  
  return { suppliers: suppliers || [], isLoading, addSupplier, updateSupplier, deleteSupplier };
}
