
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
                const serverData: PaymentMethod[] = result.data.map((pm: any) => ({
                    ...pm,
                    name: pm.name instanceof Map ? Object.fromEntries(pm.name) : pm.name,
                    description: pm.description instanceof Map ? Object.fromEntries(pm.description) : pm.description,
                }));
                
                await db.transaction('rw', db.paymentMethods, async () => {
                    const localData = await db.paymentMethods.toArray();
                    const localDataMap = new Map(localData.map(item => [item.id, item]));
                    const dataToUpdate: PaymentMethod[] = [];

                    for(const serverItem of serverData) {
                        const localItem = localDataMap.get(serverItem.id);
                        if (!localItem) {
                            dataToUpdate.push(serverItem);
                        } else {
                            const localUpdatedAt = new Date(localItem.updatedAt || 0).getTime();
                            const serverUpdatedAt = new Date(serverItem.updatedAt || 0).getTime();
                            if (serverUpdatedAt > localUpdatedAt) {
                                dataToUpdate.push(serverItem);
                            }
                        }
                    }
                    if (dataToUpdate.length > 0) {
                        await db.paymentMethods.bulkPut(dataToUpdate);
                        console.log(`[useDexiePaymentMethods] Synced ${dataToUpdate.length} payment methods from server.`);
                    }
                });

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

  return { paymentMethods: paymentMethods || [], isLoading: isLoading || paymentMethods === undefined, refetch: populateInitialData, addPaymentMethod, updatePaymentMethod, deletePaymentMethod };
}
