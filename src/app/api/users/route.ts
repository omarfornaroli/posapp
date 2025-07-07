
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User'; // Renamed to avoid conflict
import type { User as UserType } from '@/types';
import NotificationService from '@/services/notification.service';
import EmailService from '@/services/email.service'; // Import the new service
import { randomBytes } from 'crypto';

const generateAuthCode = () => Math.floor(100000 + Math.random() * 900000).toString();

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

export async function GET(request: NextRequest) {
  await dbConnect();
  try {
    const users = await UserModel.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const body = await request.json() as Omit<UserType, 'id' | 'joinDate' | 'status'> & { joinDate?: string };
    
    const userData: Partial<UserType> = { ...body };
    if (!body.joinDate) {
      userData.joinDate = new Date().toISOString();
    }
    
    // Generate a unique authorization code
    let authCode = generateAuthCode();
    while (await UserModel.findOne({ authorizationCode: authCode })) {
        authCode = generateAuthCode();
    }
    userData.authorizationCode = authCode;

    // Generate setup token
    const setupToken = randomBytes(32).toString('hex');
    const setupTokenExpires = new Date(Date.now() + 24 * 3600000); // 24 hours from now

    const newUser = await UserModel.create({
      ...userData,
      setupToken,
      setupTokenExpires,
      status: 'pending' // New users start as pending
    });
    
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.userCreated',
      messageParams: { userName: newUser.name },
      type: 'success',
      link: `/users?highlight=${newUser.id}`,
      ...actorDetails
    });

    // Send the setup email via the EmailService and check the result
    const emailResult = await EmailService.sendUserSetupEmail(newUser.email, setupToken, { name: actorDetails.actorName || 'an administrator' });
    
    // Create a more specific notification based on email delivery method
    await NotificationService.createNotification({
      messageKey: emailResult.method === 'smtp' ? 'Notifications.userInviteSent' : 'Notifications.userInviteLoggedToConsole',
      messageParams: { userEmail: newUser.email },
      type: 'info',
      ...actorDetails,
    });

    return NextResponse.json({ success: true, data: newUser }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.userCreateFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
     if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
      return NextResponse.json({ success: false, error: 'Email already exists for another user.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
