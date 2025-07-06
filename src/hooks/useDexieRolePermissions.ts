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

    // Permissions can change, so we always fetch on mount but only block on first load
    const count = await db.rolePermissions.count();
    if (count === 0) {
      setIsLoading(true);
    }
    isPopulating = true;
    
    try {
      const response = await fetch('/api/role-permissions');
      if (!response.ok) throw new Error('Failed to fetch initial role permissions');
      const result = await response.json();
      if (result.success) {
        await db.rolePermissions.bulkPut(result.data);
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
