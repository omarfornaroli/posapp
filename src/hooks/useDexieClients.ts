
// src/hooks/useDexieClients.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Client } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

let isPopulating = false; // Flag to prevent concurrent population

export function useDexieClients() {
  const [isLoading, setIsLoading] = useState(true);

  const clients = useLiveQuery(() => db.clients.toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) {
      return;
    }
    
    const clientCount = await db.clients.count();
    if (clientCount > 0) {
      setIsLoading(false);
      return;
    }

    isPopulating = true;
    setIsLoading(true);
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error('Failed to fetch initial clients');
      const result = await response.json();
      if (result.success) {
        const currentCount = await db.clients.count();
        if (currentCount === 0) {
            await db.clients.bulkAdd(result.data);
        }
      } else {
        throw new Error(result.error || 'API error fetching initial clients');
      }
    } catch (error) {
      console.warn("[useDexieClients] Failed to populate initial data (likely offline):", error);
    } finally {
      setIsLoading(false);
      isPopulating = false; // Reset the flag
    }
  }, []);
  
  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  const addClient = async (newClient: Omit<Client, 'id' | 'registrationDate'>) => {
    const tempId = generateId();
    const clientWithId: Client = {
      ...newClient,
      id: tempId,
      registrationDate: new Date().toISOString(),
    };
    
    try {
      await db.clients.add(clientWithId);
      await syncService.addToQueue({ entity: 'client', operation: 'create', data: clientWithId });
    } catch (error) {
      console.error("Failed to add client to Dexie:", error);
      throw error;
    }
  };

  const updateClient = async (updatedClient: Client) => {
     try {
      await db.clients.put(updatedClient);
      await syncService.addToQueue({ entity: 'client', operation: 'update', data: updatedClient });
    } catch (error) {
      console.error("Failed to update client in Dexie:", error);
      throw error;
    }
  };

  const deleteClient = async (clientId: string) => {
    try {
      await db.clients.delete(clientId);
      await syncService.addToQueue({ entity: 'client', operation: 'delete', data: { id: clientId } });
    } catch (error) {
      console.error("Failed to delete client from Dexie:", error);
      throw error;
    }
  };
  
  return { clients: clients || [], isLoading: isLoading || clients === undefined, addClient, updateClient, deleteClient };
}

    