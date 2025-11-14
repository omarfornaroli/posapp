// src/hooks/useDexiePaymentMethods.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { PaymentMethod } from '@/types';
import { getApiPath } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
let isPopulating = false;

export function useDexiePaymentMethods() {
  const [isLoading, setIsLoading] = useState(true);
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const count = await db.paymentMethods.count();
    if (count > 0) {
      setIsLoading(false);
      return;
    }
    
    isPopulating = true;
    setIsLoading(true);
    try {
        const response = await fetch(getApiPath('/api/payment-methods'));
        if (!response.ok) throw new Error('Failed to fetch initial payment methods');
        const result = await response.json();
        if (result.success) {
            await db.paymentMethods.bulkPut(result.data);
        } else {
            throw new Error(result.error || 'API error fetching payment methods');
        }
    } catch (error) {
        console.error("[useDexiePaymentMethods] Failed to populate initial data:", error);
    } finally {
        setIsLoading(false);
        isPopulating = false;
    }
  }, []);

  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  const addPaymentMethod = async (newMethod: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>) => {
    const tempId = generateId();
    const now = new Date().toISOString();
    const methodWithId: PaymentMethod = {
      ...newMethod,
      id: tempId,
      createdAt: now,
      updatedAt: now,
    };
    await db.paymentMethods.add(methodWithId);
    await syncService.addToQueue({ entity: 'paymentMethod', operation: 'create', data: methodWithId });
    return methodWithId;
  };

  const updatePaymentMethod = async (updatedMethod: PaymentMethod) => {
    const methodToSave = {
        ...updatedMethod,
        updatedAt: new Date().toISOString()
    };
    await db.paymentMethods.put(methodToSave);
    await syncService.addToQueue({ entity: 'paymentMethod', operation: 'update', data: methodToSave });
  };

  const deletePaymentMethod = async (id: string) => {
    await db.paymentMethods.delete(id);
    await syncService.addToQueue({ entity: 'paymentMethod', operation: 'delete', data: { id } });
  };

  return { paymentMethods: paymentMethods || [], isLoading: isLoading || paymentMethods === undefined, addPaymentMethod, updatePaymentMethod, deletePaymentMethod };
}