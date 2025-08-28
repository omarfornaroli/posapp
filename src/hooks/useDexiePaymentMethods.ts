
// src/hooks/useDexiePaymentMethods.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { PaymentMethod } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
let isPopulating = false;

export function useDexiePaymentMethods() {
  const [isLoading, setIsLoading] = useState(true);

  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const shouldFetch = navigator.onLine;

    if (shouldFetch) {
        isPopulating = true;
        setIsLoading(true);
        try {
            const response = await fetch('/api/payment-methods');
            if (!response.ok) throw new Error('Failed to fetch initial payment methods');
            const result = await response.json();
            if (result.success) {
                await db.paymentMethods.bulkPut(result.data);
            } else {
                throw new Error(result.error || 'API error fetching initial payment methods');
            }
        } catch (error) {
            console.warn("[useDexiePaymentMethods] Failed to populate initial data (likely offline):", error);
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

  const addPaymentMethod = async (newMethod: Omit<PaymentMethod, 'id'>) => {
    const tempId = generateId();
    const methodWithId: PaymentMethod = {
      ...newMethod,
      id: tempId,
    };
    await db.paymentMethods.add(methodWithId);
    await syncService.addToQueue({ entity: 'paymentMethod', operation: 'create', data: methodWithId });
  };

  const updatePaymentMethod = async (updatedMethod: PaymentMethod) => {
    await db.paymentMethods.put(updatedMethod);
    await syncService.addToQueue({ entity: 'paymentMethod', operation: 'update', data: updatedMethod });
  };

  const deletePaymentMethod = async (id: string) => {
    await db.paymentMethods.delete(id);
    await syncService.addToQueue({ entity: 'paymentMethod', operation: 'delete', data: { id } });
  };

  return { paymentMethods: paymentMethods || [], isLoading: isLoading || paymentMethods === undefined, refetch: populateInitialData, addPaymentMethod, updatePaymentMethod, deletePaymentMethod };
}
