
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import RolePermission from '@/models/RolePermission';
import { getAllRolesWithAssignedPermissions as fetchAllRolesPermissionsFromDb } from '@/lib/permissions';

// GET all roles and their permissions
export async function GET() {
  await dbConnect();
  try {
    const rolesWithPermissions = await fetchAllRolesPermissionsFromDb();
    return NextResponse.json({ success: true, data: rolesWithPermissions });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching role permissions';
    console.error("[API/role-permissions GET] Error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

    