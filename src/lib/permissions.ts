
import type { UserRole, Permission } from '@/types';
import dbConnect from './dbConnect';
import RolePermissionModel from '@/models/RolePermission';
import { ALL_PERMISSIONS } from './permissionKeys'; 

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  Admin: [...ALL_PERMISSIONS], 
  Editor: [
    'access_dashboard_page',
    'access_pos_page',
    'process_payment_action',
    'clear_cart_action',
    'manage_products_page',
    'manage_sales_reports_page',
    'manage_clients_page',
    'manage_promotions_page',
    'manage_taxes_page',
    'manage_payment_methods_page',
    'manage_users_page',
    'manage_suppliers_page',
    'manage_dispatches_page',
    'manage_notifications_page',
    'view_roles_permissions_page', 
    'manage_countries_page',
    'manage_currencies_page',
    'manage_reports_page',
    'change_global_currency',
  ],
  Viewer: [
    'access_pos_page',
    'manage_notifications_page',
  ],
};

export async function checkPermission(userRole: UserRole | undefined, permissionToCheck: Permission): Promise<boolean> {
  if (!userRole) {
    return false;
  }
  try {
    await dbConnect();
    const roleConfig = await RolePermissionModel.findOne({ role: userRole }).lean();
    if (!roleConfig || !roleConfig.permissions) {
      console.warn(`[Permissions] Role '${userRole}' not found in DB or has no permissions defined. Falling back to static defaults.`);
      return DEFAULT_ROLE_PERMISSIONS[userRole]?.includes(permissionToCheck) || false;
    }
    return roleConfig.permissions.includes(permissionToCheck);
  } catch (error) {
    console.error(`[Permissions] Error checking permission for role '${userRole}':`, error);
    return DEFAULT_ROLE_PERMISSIONS[userRole]?.includes(permissionToCheck) || false;
  }
}

export async function getUserPermissions(userRole: UserRole | undefined): Promise<Permission[]> {
  if (!userRole) {
    return [];
  }
  try {
    await dbConnect();
    const roleConfig = await RolePermissionModel.findOne({ role: userRole }).lean();
    if (!roleConfig || !roleConfig.permissions) {
      console.warn(`[Permissions] Role '${userRole}' not found in DB for getUserPermissions. Falling back to static defaults.`);
      return DEFAULT_ROLE_PERMISSIONS[userRole] || [];
    }
    return roleConfig.permissions;
  } catch (error) {
    console.error(`[Permissions] Error fetching permissions for role '${userRole}':`, error);
    return DEFAULT_ROLE_PERMISSIONS[userRole] || [];
  }
}

export async function getAllRolesWithAssignedPermissions(): Promise<{ role: UserRole; permissions: Permission[] }[]> {
  try {
    await dbConnect();
    const allRoleConfigs = await RolePermissionModel.find({}).lean();
    
    const result = (Object.keys(DEFAULT_ROLE_PERMISSIONS) as UserRole[]).map(roleName => {
      const dbConfig = allRoleConfigs.find(rc => rc.role === roleName);
      return {
        role: roleName,
        permissions: dbConfig ? dbConfig.permissions : (DEFAULT_ROLE_PERMISSIONS[roleName] || []),
      };
    });
    return result;

  } catch (error) {
    console.error('[Permissions] Error fetching all roles with permissions from DB:', error);
    return (Object.keys(DEFAULT_ROLE_PERMISSIONS) as UserRole[]).map(role => ({
      role,
      permissions: DEFAULT_ROLE_PERMISSIONS[role],
    }));
  }
}
