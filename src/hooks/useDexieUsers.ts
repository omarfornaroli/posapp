

// src/hooks/useDexieUsers.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { User } from '@/types';

export function useDexieUsers() {
  const users = useLiveQuery(async () => {
    const usersFromDb = await db.users.toArray();
    const rolePermissions = await db.rolePermissions.toArray();
    const permissionsMap = new Map(rolePermissions.map(rp => [rp.role, rp.permissions]));
    
    return usersFromDb.map(user => ({
      ...user,
      permissions: permissionsMap.get(user.role) || [],
    }));
  }, []);

  const isLoading = users === undefined;

  const addUser = async (newUserData: Omit<User, 'id' | 'joinDate' | 'status' | 'permissions'>) => {
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
      await db.users.put(result.data);
      return result.data;
    } catch (error) {
        console.error("Failed to add user:", error);
        throw error;
    }
  };

  const updateUser = async (updatedUser: User) => {
    const { permissions, ...userToSave } = updatedUser;
    await db.users.put(userToSave);
    await syncService.addToQueue({ entity: 'user', operation: 'update', data: userToSave });
  };

  const deleteUser = async (id: string) => {
    await db.users.delete(id);
    await syncService.addToQueue({ entity: 'user', operation: 'delete', data: { id } });
  };

  return { users: users || [], isLoading, addUser, updateUser, deleteUser };
}
