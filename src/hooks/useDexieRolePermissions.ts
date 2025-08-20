// src/hooks/useDexieRolePermissions.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import type { RolePermission } from '@/types';
import { useState, useEffect, useCallback } from 'react';

let isPopulating = false;

export function useDexieRolePermissions() {
  const [isLoading, setIsLoading] = useState(true);

  const rolesWithPermissions = useLiveQuery(() => db.rolePermissions.toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const count = await db.rolePermissions.count();
    if (count > 0) {
      setIsLoading(false);
    } else {
      setIsLoading(true); 
    }

    isPopulating = true;
    
    try {
      const response = await fetch('/api/role-permissions');
      if (!response.ok) throw new Error('Failed to fetch initial role permissions');
      const result = await response.json();
      if (result.success) {
        // The API returns an 'id' but our Dexie table uses 'role' as PK.
        // We ensure the objects being put match the Dexie schema by removing the 'id'.
        const permsToSave: RolePermission[] = result.data.map((p: any) => ({
          role: p.role,
          permissions: p.permissions,
        }));
        await db.rolePermissions.bulkPut(permsToSave);
      } else {
        throw new Error(result.error || 'API error fetching initial role permissions');
      }
    } catch (error) {
      console.warn("[useDexieRolePermissions] Failed to populate initial data (likely offline):", error);
    } finally {
      setIsLoading(false);
      isPopulating = false;
    }
  }, []);

  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  return { rolesWithPermissions: rolesWithPermissions || [], isLoading: isLoading || rolesWithPermissions === undefined, refetch: populateInitialData };
}
