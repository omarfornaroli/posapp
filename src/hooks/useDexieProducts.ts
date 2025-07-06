// src/hooks/useDexieProducts.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Product } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const generateClientId = () => crypto.randomUUID();

export function useDexieProducts() {
  const [isLoading, setIsLoading] = useState(true);

  // Live query to get products from IndexedDB
  const products = useLiveQuery(() => db.products.toArray(), []);

  // Function to pull initial data from API to Dexie
  const populateInitialData = useCallback(async () => {
    const productCount = await db.products.count();
    if (productCount > 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch initial products');
      const result = await response.json();
      if (result.success) {
        await db.products.bulkAdd(result.data);
      } else {
        throw new Error(result.error || 'API error fetching initial products');
      }
    } catch (error) {
      console.warn("[useDexieProducts] Failed to populate initial data (likely offline):", error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Effect to run initial population check
  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  const addProduct = async (newProduct: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Generate a temporary client-side ID for immediate UI updates
    const tempId = `temp-${generateClientId()}`;
    const productWithId: Product = {
      ...newProduct,
      id: tempId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      await db.products.put({
          ...updatedProduct,
          updatedAt: new Date().toISOString(),
      });
      await syncService.addToQueue({ entity: 'product', operation: 'update', data: updatedProduct });
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
