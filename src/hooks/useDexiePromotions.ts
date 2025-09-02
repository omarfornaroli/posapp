
// src/hooks/useDexiePromotions.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Promotion } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

let isPopulating = false;

export function useDexiePromotions() {
  const [isLoading, setIsLoading] = useState(true);

  const promotions = useLiveQuery(() => db.promotions.toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;
    
    const shouldFetch = navigator.onLine;

    if (shouldFetch) {
        isPopulating = true;
        setIsLoading(true);
        try {
            const response = await fetch('/api/promotions');
            if (!response.ok) throw new Error('Failed to fetch initial promotions');
            const result = await response.json();
            if (result.success) {
                 const serverPromotions: Promotion[] = result.data;
                 const localPromotions = await db.promotions.toArray();
                 const localPromotionMap = new Map(localPromotions.map(p => [p.id, p]));

                 const promotionsToUpdate: Promotion[] = [];
                 const conflicts: { local: Promotion, server: Promotion }[] = [];

                 for (const serverPromotion of serverPromotions) {
                    const localPromotion = localPromotionMap.get(serverPromotion.id);
                    if (localPromotion) {
                        const localUpdatedAt = new Date(localPromotion.updatedAt || 0).getTime();
                        const serverUpdatedAt = new Date(serverPromotion.updatedAt || 0).getTime();
                        const localCreatedAt = new Date(localPromotion.createdAt || 0).getTime();

                        if (serverUpdatedAt > localUpdatedAt && localUpdatedAt === localCreatedAt) {
                            promotionsToUpdate.push(serverPromotion);
                        } else if (serverUpdatedAt > localUpdatedAt && localUpdatedAt > localCreatedAt) {
                             conflicts.push({ local: localPromotion, server: serverPromotion });
                             console.warn(`Conflict detected for Promotion ${serverPromotion.id}. Local changes will be kept for now.`);
                        }
                    } else {
                        promotionsToUpdate.push(serverPromotion);
                    }
                }
                
                if (promotionsToUpdate.length > 0) {
                    await db.promotions.bulkPut(promotionsToUpdate);
                    console.log(`[useDexiePromotions] Automatically synced ${promotionsToUpdate.length} promotions from server.`);
                }
                if (conflicts.length > 0) {
                    console.log("Unhandled promotion conflicts:", conflicts);
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
    } else {
        setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

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
  
  return { promotions: promotions || [], isLoading: isLoading || promotions === undefined, refetch: populateInitialData, addPromotion, updatePromotion, deletePromotion };
}
