
// src/hooks/useDexiePromotions.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Promotion } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const generatePromotionId = () => `temp-${crypto.randomUUID()}`;

let isPopulating = false;

export function useDexiePromotions() {
  const [isLoading, setIsLoading] = useState(true);

  const promotions = useLiveQuery(() => db.promotions.toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) {
      return;
    }
    
    const promotionCount = await db.promotions.count();
    if (promotionCount > 0) {
      setIsLoading(false);
      return;
    }

    isPopulating = true;
    setIsLoading(true);
    try {
      const response = await fetch('/api/promotions');
      if (!response.ok) throw new Error('Failed to fetch initial promotions');
      const result = await response.json();
      if (result.success) {
        const currentCount = await db.promotions.count();
        if (currentCount === 0) {
            await db.promotions.bulkAdd(result.data);
        }
      } else {
        throw new Error(result.error || 'API error fetching initial promotions');
      }
    } catch (error) {
      console.warn("[useDexiePromotions] Failed to populate initial data (likely offline):", error);
    } finally {
      setIsLoading(false);
      isPopulating = false;
    }
  }, []);
  
  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  const addPromotion = async (newPromotion: Omit<Promotion, 'id'>) => {
    const tempId = generatePromotionId();
    const promotionWithId: Promotion = {
      ...newPromotion,
      id: tempId,
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
      await db.promotions.put(updatedPromotion);
      await syncService.addToQueue({ entity: 'promotion', operation: 'update', data: updatedPromotion });
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
  
  return { promotions: promotions || [], isLoading: isLoading || promotions === undefined, refetch: populateInitialData, addPromotion, updatePromotion, deletePromotion };
}
