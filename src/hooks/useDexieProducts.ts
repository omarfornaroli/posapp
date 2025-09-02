
// src/hooks/useDexieProducts.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Product } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
let isPopulating = false;

export function useDexieProducts() {
  const [isLoading, setIsLoading] = useState(true);

  // Live query to get products from IndexedDB
  const products = useLiveQuery(() => db.products.toArray(), []);

  // Function to pull initial data from API to Dexie
  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const shouldFetch = navigator.onLine;

    if (shouldFetch) {
        isPopulating = true;
        setIsLoading(true);
        try {
            const response = await fetch('/api/products');
            if (!response.ok) throw new Error('Failed to fetch initial products');
            const result = await response.json();
            if (result.success) {
                const serverProducts: Product[] = result.data;
                const localProducts = await db.products.toArray();
                const localProductMap = new Map(localProducts.map(p => [p.id, p]));
                
                const productsToUpdate: Product[] = [];
                const conflicts: { local: Product, server: Product }[] = [];

                for (const serverProduct of serverProducts) {
                    const localProduct = localProductMap.get(serverProduct.id);
                    if (localProduct) {
                        const localUpdatedAt = new Date(localProduct.updatedAt || 0).getTime();
                        const serverUpdatedAt = new Date(serverProduct.updatedAt || 0).getTime();
                        const localCreatedAt = new Date(localProduct.createdAt || 0).getTime();

                        if (serverUpdatedAt > localUpdatedAt && localUpdatedAt === localCreatedAt) {
                            productsToUpdate.push(serverProduct);
                        } else if (serverUpdatedAt > localUpdatedAt && localUpdatedAt > localCreatedAt) {
                             conflicts.push({ local: localProduct, server: serverProduct });
                             console.warn(`Conflict detected for Product ${serverProduct.id}. Local changes will be kept for now.`);
                        }
                    } else {
                        productsToUpdate.push(serverProduct);
                    }
                }

                if (productsToUpdate.length > 0) {
                    await db.products.bulkPut(productsToUpdate);
                    console.log(`[useDexieProducts] Automatically synced ${productsToUpdate.length} products from server.`);
                }
                 if (conflicts.length > 0) {
                    // Here you would trigger the UI to show the conflict resolution dialog
                    console.log("Unhandled product conflicts:", conflicts);
                }
            } else {
                throw new Error(result.error || 'API error fetching initial products');
            }
        } catch (error) {
            console.warn("[useDexieProducts] Failed to populate initial data (likely offline):", error);
        } finally {
            setIsLoading(false);
            isPopulating = false;
        }
    } else {
        setIsLoading(false);
    }
  }, []);
  
  // Effect to run initial population check
  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  const addProduct = async (newProduct: Omit<Product, 'id'>) => {
    // Generate a temporary client-side ID for immediate UI updates
    const tempId = generateId();
    const now = new Date().toISOString();
    const productWithId: Product = {
      ...newProduct,
      id: tempId,
      createdAt: now,
      updatedAt: now,
    };
    
    try {
      await db.products.add(productWithId);
      await syncService.addToQueue({ entity: 'product', operation: 'create', data: productWithId });
    } catch (error) {
      console.error("Failed to add product to Dexie:", error);
      throw error; // Re-throw to be caught by the UI
    }
  };

  const updateProduct = async (updatedProduct: Product) => {
     try {
      const productToUpdate = { ...updatedProduct, updatedAt: new Date().toISOString() };
      await db.products.put(productToUpdate);
      await syncService.addToQueue({ entity: 'product', operation: 'update', data: productToUpdate });
    } catch (error) {
      console.error("Failed to update product in Dexie:", error);
      throw error;
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      await db.products.delete(productId);
      await syncService.addToQueue({ entity: 'product', operation: 'delete', data: { id: productId } });
    } catch (error) {
      console.error("Failed to delete product from Dexie:", error);
      throw error;
    }
  };
  
  return { products: products || [], isLoading: isLoading || products === undefined, refetch: populateInitialData, addProduct, updateProduct, deleteProduct };
}
