
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import EmailService from '@/services/email.service';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    
    // Always return a success message to prevent email enumeration attacks
    if (user && user.status === 'active') {
      const resetToken = randomBytes(32).toString('hex');
      const passwordResetToken = resetToken;
      const passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour from now

      user.passwordResetToken = passwordResetToken;
      user.passwordResetExpires = passwordResetExpires;
      await user.save();

      // We don't need to do anything with the return value here, as the public
      // response should always be the same. The service will handle logging.
      await EmailService.sendPasswordResetEmail(user.email, resetToken);
    }
    
    return NextResponse.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
  
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    console.error('[API/auth/request-password-reset] Error:', error);
    // Don't leak server errors
    return NextResponse.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
  }
}
