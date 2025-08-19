
// src/hooks/useDexieUsers.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { User, Permission, RolePermission } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const generateId = () => `temp-${crypto.randomUUID()}`;
let isPopulating = false;

export function useDexieUsers() {
  const [isLoading, setIsLoading] = useState(true);

  // Live query to get users from IndexedDB, now including permissions
  const users = useLiveQuery(async () => {
    const usersFromDb = await db.users.toArray();
    const rolePermissions = await db.rolePermissions.toArray();
    const permissionsMap = new Map(rolePermissions.map(rp => [rp.role, rp.permissions]));
    
    return usersFromDb.map(user => ({
      ...user,
      permissions: permissionsMap.get(user.role) || [],
    }));
  }, []);

  // Function to pull initial data from API to Dexie
  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const count = await db.users.count();
    if (count > 0) {
      setIsLoading(false);
      // Even if data exists, we might want to refresh it from the server if online
    } else {
      setIsLoading(true);
    }
    
    isPopulating = true;
    
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch initial users');
      const result = await response.json();
      if (result.success) {
        await db.users.bulkPut(result.data); // Use bulkPut to add/update
      } else {
        throw new Error(result.error || 'API error fetching initial users');
      }

      // Also fetch role permissions
      const permsResponse = await fetch('/api/role-permissions');
       if (!permsResponse.ok) throw new Error('Failed to fetch initial role permissions');
      const permsResult = await permsResponse.json();
      if(permsResult.success) {
        // The role itself is the primary key now, so we don't need a separate id
        const permsToSave: RolePermission[] = permsResult.data.map((p: any) => ({
            role: p.role,
            permissions: p.permissions
        }));
        await db.rolePermissions.bulkPut(permsToSave);
      }

    } catch (error) {
      console.warn("[useDexieUsers] Failed to populate initial data (likely offline):", error);
    } finally {
      setIsLoading(false);
      isPopulating = false;
    }
  }, []);
  
  // Effect to run initial population check
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
    // The permissions property is transient and should not be saved to the users table
    const { permissions, ...userToSave } = updatedUser;
    await db.users.put(userToSave);
    await syncService.addToQueue({ entity: 'user', operation: 'update', data: userToSave });
  };

  const deleteUser = async (id: string) => {
    await db.users.delete(id);
    await syncService.addToQueue({ entity: 'user', operation: 'delete', data: { id } });
  };

  return { users: users || [], isLoading: isLoading || users === undefined, refetch: populateInitialData, addUser, updateUser, deleteUser };
}
