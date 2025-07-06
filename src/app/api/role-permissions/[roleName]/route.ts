
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import RolePermissionModel from '@/models/RolePermission';
import UserModel from '@/models/User';
import type { UserRole, Permission } from '@/types';
import NotificationService from '@/services/notification.service';
import { ALL_PERMISSIONS } from '@/lib/permissions';

interface Params {
  roleName: UserRole;
}

async function getActorDetails(request: Request) {
  const userEmail = request.headers.get('X-User-Email');
  if (userEmail) {
    const actingUser = await UserModel.findOne({ email: userEmail }).lean();
    if (actingUser) {
      return {
        actorId: actingUser._id.toString(),
        actorName: actingUser.name,
        actorImageUrl: actingUser.imageUrl,
      };
    }
  }
  return {};
}

// PUT to update permissions for a specific role
export async function PUT(request: Request, { params }: { params: Params }) {
  const { roleName } = params;
  
  if (!['Admin', 'Editor', 'Viewer'].includes(roleName)) {
    return NextResponse.json({ success: false, error: 'Invalid role name provided.' }, { status: 400 });
  }

  await dbConnect();
  try {
    const body = await request.json() as { permissions: Permission[] };
    const { permissions } = body;

    if (!Array.isArray(permissions) || !permissions.every(p => ALL_PERMISSIONS.includes(p))) {
      return NextResponse.json({ success: false, error: 'Invalid permissions array provided.' }, { status: 400 });
    }

    // Admins cannot have their permissions reduced below the minimum required (all permissions)
    if (roleName === 'Admin') {
      const allPermissionsSet = new Set(ALL_PERMISSIONS);
      const providedPermissionsSet = new Set(permissions);
      if (allPermissionsSet.size !== providedPermissionsSet.size || !ALL_PERMISSIONS.every(p => providedPermissionsSet.has(p))) {
        return NextResponse.json({ success: false, error: 'Admin role must retain all permissions.' }, { status: 403 });
      }
    }

    const updatedRolePermission = await RolePermissionModel.findOneAndUpdate(
      { role: roleName },
      { $set: { permissions: permissions } },
      { new: true, upsert: true, runValidators: true }
    );

    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.rolePermissionsUpdated',
      messageParams: { roleName: roleName },
      type: 'success',
      link: '/roles',
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: updatedRolePermission });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error updating role permissions.';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.rolePermissionsUpdateFailed',
        messageParams: { roleName: roleName, error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    console.error(`[API/role-permissions/${roleName} PUT] Error:`, error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

    