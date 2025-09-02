
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

    const shouldFetch = navigator.onLine;

    if (shouldFetch) {
        isPopulating = true;
        setIsLoading(true); 
        try {
            const response = await fetch('/api/role-permissions');
            if (!response.ok) throw new Error('Failed to fetch initial role permissions');
            const result = await response.json();
            if (result.success) {
                const serverData: RolePermission[] = result.data.map((p: any) => ({
                    id: p.role, // Use the role name as the primary key
                    role: p.role,
                    permissions: p.permissions
                }));

                 const localData = await db.rolePermissions.toArray();
                 const localDataMap = new Map(localData.map(item => [item.role, item])); // Use role name as the key
                 const dataToUpdate: RolePermission[] = [];

                 for(const serverItem of serverData) {
                     const localItem = localDataMap.get(serverItem.role);
                     if (!localItem) {
                         dataToUpdate.push(serverItem);
                     }
                     // For roles, we assume the server is always the source of truth
                     // and don't do an updated_at check, just overwrite if permissions differ.
                     else if(JSON.stringify(localItem.permissions.sort()) !== JSON.stringify(serverItem.permissions.sort())) {
                         dataToUpdate.push(serverItem);
                     }
                 }
                if (dataToUpdate.length > 0) {
                   await db.rolePermissions.bulkPut(dataToUpdate);
                   console.log(`[useDexieRolePermissions] Synced ${dataToUpdate.length} roles from server.`);
                }
            } else {
                throw new Error(result.error || 'API error fetching initial role permissions');
            }
        } catch (error) {
            console.warn("[useDexieRolePermissions] Failed to populate initial data (likely offline):", error);
        } finally {
            setIsLoading(false);
            isPopulating = false;
        }
    } else {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  return { rolesWithPermissions: rolesWithPermissions || [], isLoading: isLoading || rolesWithPermissions === undefined, refetch: populateInitialData };
}
