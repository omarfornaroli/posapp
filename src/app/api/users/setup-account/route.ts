import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import type { UserDocument } from '@/models/User';

export async function POST(request: Request) {
  await dbConnect();

  try {
    const { token, name, password } = await request.json();

    if (!token || !name || !password) {
      return NextResponse.json({ success: false, error: 'Token, name, and password are required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    // Find the user by the setup token and check if it's expired
    const user = await UserModel.findOne({
      setupToken: token,
      setupTokenExpires: { $gt: new Date() },
    }).select('+password +setupToken +setupTokenExpires') as UserDocument | null;

    if (!user) {
      return NextResponse.json({ success: false, error: 'Token is invalid or has expired.' }, { status: 400 });
    }

    // Update user details
    user.name = name;
    user.password = password; // The pre-save hook will hash this
    user.status = 'active';
    user.setupToken = undefined;
    user.setupTokenExpires = undefined;

    await user.save();

    return NextResponse.json({ success: true, message: 'Account setup successful.' });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error during account setup.';
    console.error('[API/users/setup-account] Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
