
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { authorizationCode } = await request.json();

    if (!authorizationCode) {
      return NextResponse.json({ success: false, error: 'Authorization code is required' }, { status: 400 });
    }

    const user = await UserModel.findOne({ 
      authorizationCode: authorizationCode,
      role: { $in: ['Admin', 'Editor'] }
    }).lean();

    if (user) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid authorization code or insufficient permissions.' }, { status: 401 });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    console.error('[API/auth/validate-code] Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
