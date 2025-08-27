import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import POSSetting from '@/models/POSSetting';
import type { UserDocument } from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { email, password, rememberMe } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() }).select('+password') as UserDocument | null;

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }
    
    if (user.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Account is not active. Please complete setup or contact an administrator.' }, { status: 403 });
    }
    
    if (!user.password) {
       return NextResponse.json({ success: false, error: 'Account password not set up.' }, { status: 401 });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }
    
    const now = new Date();
    let expiresIn;

    if (rememberMe) {
      expiresIn = 15 * 24 * 60 * 60 * 1000; // 15 days
    } else {
      const posSettings = await POSSetting.findOne({});
      const sessionDurationMinutes = posSettings?.sessionDuration || 30; // Default to 30 minutes
      expiresIn = sessionDurationMinutes * 60 * 1000;
    }
      
    const expiresAt = now.getTime() + expiresIn;

    return NextResponse.json({ success: true, email: user.email, expiresAt });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    console.error('[API/auth/login] Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

    