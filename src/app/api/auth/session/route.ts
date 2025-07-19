
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import { getUserPermissions } from '@/lib/permissions';
import type { User as UserType, Permission } from '@/types';

export async function GET(request: NextRequest) {
  // In a real app, user identification would come from a session cookie or auth token.
  // For this mock setup, we'll rely on an email passed in a header or query param.
  // THIS IS NOT SECURE FOR PRODUCTION.
  const userEmailFromHeader = request.headers.get('X-User-Email');
  const { searchParams } = request.nextUrl;
  const userEmailFromQuery = searchParams.get('email');

  const userEmail = userEmailFromHeader || userEmailFromQuery;

  if (!userEmail) {
    return NextResponse.json({ success: false, error: 'User email not provided' }, { status: 401 });
  }

  try {
    await dbConnect();
    const user = await UserModel.findOne({ email: userEmail.toLowerCase().trim() }).lean();

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const permissions = await getUserPermissions(user.role as UserType['role']);
    
    const userWithPermissions: UserType = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role as UserType['role'],
      joinDate: user.joinDate.toString(),
      imageUrl: user.imageUrl,
      permissions: permissions,
      status: user.status as UserType['status'],
      authorizationCode: user.authorizationCode
    };

    return NextResponse.json({ success: true, data: userWithPermissions });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching user session';
    console.error('[API/auth/session GET] Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

    