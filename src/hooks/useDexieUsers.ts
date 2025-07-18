
// src/hooks/useDexieUsers.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { User } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const generateId = () => `temp-${crypto.randomUUID()}`;
let isPopulating = false;

export function useDexieUsers() {
  const [isLoading, setIsLoading] = useState(true);

  const users = useLiveQuery(() => db.users.toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const count = await db.users.count();
    if (count > 0) {
      setIsLoading(false);
      return;
    }

    isPopulating = true;
    setIsLoading(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch initial users');
      const result = await response.json();
      if (result.success) {
        await db.users.bulkAdd(result.data);
      } else {
        throw new Error(result.error || 'API error fetching initial users');
      }
    } catch (error) {
      console.warn("[useDexieUsers] Failed to populate initial data (likely offline):", error);
    } finally {
      setIsLoading(false);
      isPopulating = false;
    }
  }, []);

  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  const addUser = async (newUserData: Omit<User, 'id' | 'joinDate' | 'status' | 'permissions'>) => {
    // Adding a user requires online action to get tokens, etc.
    // The hook will call the API, then add the result to Dexie.
    // This makes the 'add' action online-only for this specific entity.
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      const userEmail = localStorage.getItem('loggedInUserEmail');
      if (userEmail) headers['X-User-Email'] = userEmail;

      const response = await fetch('/api/users', {
        method: 'POST',
        headers,
        body: JSON.stringify(newUserData),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add user via API');
      }
      await db.users.put(result.data); // Use put to add or update
      return result.data;
    } catch (error) {
        console.error("Failed to add user:", error);
        throw error; // Re-throw to be caught by the UI
    }
  };

  const updateUser = async (updatedUser: User) => {
    await db.users.put(updatedUser);
    await syncService.addToQueue({ entity: 'user', operation: 'update', data: updatedUser });
  };

  const deleteUser = async (id: string) => {
    await db.users.delete(id);
    await syncService.addToQueue({ entity: 'user', operation: 'delete', data: { id } });
  };

  return { users: users || [], isLoading: isLoading || users === undefined, refetch: populateInitialData, addUser, updateUser, deleteUser };
}
