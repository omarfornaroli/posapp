

// src/hooks/useDexieProducts.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Product } from '@/types';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export function useDexieProducts() {
  const products = useLiveQuery(() => db.products.toArray(), []);
  const isLoading = products === undefined;

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
  
  return { products: products || [], isLoading, addProduct, updateProduct, deleteProduct };
}
