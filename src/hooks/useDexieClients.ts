// src/hooks/useDexieClients.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Client } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { getApiPath } from '@/lib/utils';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export function useDexieClients() {
  const clients = useLiveQuery(() => db.clients.toArray(), []);
  const isLoading = clients === undefined;

  const addClient = async (newClient: Omit<Client, 'id' | 'registrationDate' | 'createdAt' | 'updatedAt'>) => {
    const tempId = generateId();
    const now = new Date().toISOString();
    const clientWithId: Client = {
      ...newClient,
      id: tempId,
      registrationDate: now,
      createdAt: now,
      updatedAt: now,
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
      const clientToUpdate = { ...updatedClient, updatedAt: new Date().toISOString() };
      await db.clients.put(clientToUpdate);
      await syncService.addToQueue({ entity: 'client', operation: 'update', data: clientToUpdate });
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
  
  return { clients: clients || [], isLoading, addClient, updateClient, deleteClient };
}