

// src/hooks/useDexiePaymentMethods.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { PaymentMethod } from '@/types';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export function useDexiePaymentMethods() {
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray(), []);
  const isLoading = paymentMethods === undefined;

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

  return { paymentMethods: paymentMethods || [], isLoading, addPaymentMethod, updatePaymentMethod, deletePaymentMethod };
}
