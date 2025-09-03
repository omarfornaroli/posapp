

// src/hooks/useDexiePromotions.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Promotion } from '@/types';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export function useDexiePromotions() {
  const promotions = useLiveQuery(() => db.promotions.toArray(), []);
  const isLoading = promotions === undefined;

  const addPromotion = async (newPromotion: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>) => {
    const tempId = generateId();
    const now = new Date().toISOString();
    const promotionWithId: Promotion = {
      ...newPromotion,
      id: tempId,
      createdAt: now,
      updatedAt: now,
    };
    
    try {
      await db.promotions.add(promotionWithId);
      await syncService.addToQueue({ entity: 'promotion', operation: 'create', data: promotionWithId });
    } catch (error) {
      console.error("Failed to add promotion to Dexie:", error);
      throw error;
    }
  };

  const updatePromotion = async (updatedPromotion: Promotion) => {
     try {
      const promotionToUpdate = { ...updatedPromotion, updatedAt: new Date().toISOString() };
      await db.promotions.put(promotionToUpdate);
      await syncService.addToQueue({ entity: 'promotion', operation: 'update', data: promotionToUpdate });
    } catch (error) {
      console.error("Failed to update promotion in Dexie:", error);
      throw error;
    }
  };

  const deletePromotion = async (promotionId: string) => {
    try {
      await db.promotions.delete(promotionId);
      await syncService.addToQueue({ entity: 'promotion', operation: 'delete', data: { id: promotionId } });
    } catch (error) {
      console.error("Failed to delete promotion from Dexie:", error);
      throw error;
    }
  };
  
  return { promotions: promotions || [], isLoading, addPromotion, updatePromotion, deletePromotion };
}
