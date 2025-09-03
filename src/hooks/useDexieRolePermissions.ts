

// src/hooks/useDexieRolePermissions.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';

export function useDexieRolePermissions() {
  const rolesWithPermissions = useLiveQuery(() => db.rolePermissions.toArray(), []);
  const isLoading = rolesWithPermissions === undefined;
  // Refetch is handled globally
  return { rolesWithPermissions: rolesWithPermissions || [], isLoading };
}
