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

    // Check count first. If > 0, we can show cached data while we fetch updates.
    const count = await db.rolePermissions.count();
    if (count > 0) {
      setIsLoading(false);
    } else {
      setIsLoading(true); // Only show loader if DB is completely empty.
    }

    isPopulating = true;
    
    try {
      const response = await fetch('/api/role-permissions');
      if (!response.ok) throw new Error('Failed to fetch initial role permissions');
      const result = await response.json();
      if (result.success) {
        // The API now returns an 'id' but our Dexie table uses 'role' as PK.
        // We ensure the objects being put match the Dexie schema.
        const permsToSave: RolePermission[] = result.data.map((p: any) => ({
          ...p,
          id: p.role, // Use the role as the 'id' for the primary key
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
