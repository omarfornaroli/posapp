
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

    const shouldFetch = navigator.onLine;

    if (shouldFetch) {
        isPopulating = true;
        setIsLoading(true);
        try {
            const usersResponse = await fetch('/api/users');
            if (!usersResponse.ok) throw new Error('Failed to fetch initial users');
            const usersResult = await usersResponse.json();
            if (usersResult.success) {
                const serverData: User[] = usersResult.data;
                const localData = await db.users.toArray();
                const localDataMap = new Map(localData.map(item => [item.id, item]));
                const dataToUpdate: User[] = [];

                for (const serverItem of serverData) {
                    const localItem = localDataMap.get(serverItem.id);
                    if (!localItem) {
                        dataToUpdate.push(serverItem);
                    } else {
                        const localUpdatedAt = new Date(localItem.updatedAt || 0).getTime();
                        const serverUpdatedAt = new Date(serverItem.updatedAt || 0).getTime();
                        if (serverUpdatedAt > localUpdatedAt) {
                            dataToUpdate.push(serverItem);
                        }
                    }
                }
                if (dataToUpdate.length > 0) {
                    await db.users.bulkPut(dataToUpdate);
                    console.log(`[useDexieUsers] Synced ${dataToUpdate.length} users from server.`);
                }
            } else {
                throw new Error(usersResult.error || 'API error fetching initial users');
            }

            // Also fetch role permissions
            const permsResponse = await fetch('/api/role-permissions');
            if (!permsResponse.ok) throw new Error('Failed to fetch initial role permissions');
            const permsResult = await permsResponse.json();
            if(permsResult.success) {
                 const permsToSave: RolePermission[] = permsResult.data.map((p: any) => ({
                    id: p.role, // Use role as the primary key for Dexie
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
    } else {
        setIsLoading(false);
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
