
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import type { UserDocument } from '@/models/User';
import EmailService from '@/services/email.service';
import NotificationService from '@/services/notification.service';
import { randomBytes } from 'crypto';

async function getActorDetails(request: NextRequest) {
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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    await dbConnect();

    const user = await UserModel.findById(id) as UserDocument | null;

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    if (user.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'This user has already completed their account setup.' }, { status: 400 });
    }

    // Generate a new setup token and expiry
    user.setupToken = randomBytes(32).toString('hex');
    user.setupTokenExpires = new Date(Date.now() + 24 * 3600000); // 24 hours from now

    await user.save();

    const actorDetails = await getActorDetails(request);
    
    // Send the setup email and get the delivery method
    const emailResult = await EmailService.sendUserSetupEmail(user.email, user.setupToken, { name: actorDetails.actorName || 'an administrator' });
    
    // Create a notification for the action
    await NotificationService.createNotification({
      messageKey: 'Notifications.userInviteResent',
      messageParams: { userEmail: user.email },
      type: 'info',
      ...actorDetails,
    });

    return NextResponse.json({ success: true, message: `Invitation resent to ${user.email}`, deliveryMethod: emailResult.method });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error.';
    console.error(`[API/users/${id}/resend-invitation] Error:`, error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
