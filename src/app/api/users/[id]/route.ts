
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User'; // Renamed to avoid conflict with User type
import type { User as UserType, UserDocument } from '@/types';
import NotificationService from '@/services/notification.service';

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

export async function GET(request: Request, { params }: any) {
  const { id } = params;
  await dbConnect();

  try {
    const user = await UserModel.findById(id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

export async function PUT(request: Request, { params }: any) {
  const { id } = params;
  await dbConnect();

  try {
    const body = await request.json() as Partial<Omit<UserType, 'id'>> & { password?: string };
    
    if (body.imageUrl === '') {
       body.imageUrl = undefined;
    }
    
    // Find the user first to handle password hashing conditionally
    const user = await UserModel.findById(id).select('+password') as UserDocument | null;

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    // Update non-password fields
    user.name = body.name || user.name;
    user.email = body.email || user.email;
    user.role = body.role || user.role;
    if (body.imageUrl !== undefined) {
      user.imageUrl = body.imageUrl;
    }
    if(body.authorizationCode) {
      user.authorizationCode = body.authorizationCode;
    }

    // Handle password update
    if (body.password) {
      if (body.password.length < 8) {
        return NextResponse.json({ success: false, error: 'Password must be at least 8 characters long.' }, { status: 400 });
      }
      user.password = body.password; // The pre-save hook will hash it
    }
    
    await user.save();

    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.userUpdated',
      messageParams: { userName: user.name },
      type: 'success',
      link: `/users?highlight=${user.id}`,
      ...actorDetails
    });

    // Return user data without password
    const userObject = user.toObject();
    delete userObject.password;

    return NextResponse.json({ success: true, data: userObject });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.userUpdateFailed',
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

export async function DELETE(request: Request, { params }: any) {
  const { id } = params;
  await dbConnect();

  try {
    const deletedUser = await UserModel.findByIdAndDelete(id);
    if (!deletedUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.userDeleted',
      messageParams: { userName: deletedUser.name },
      type: 'info',
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: { message: "User deleted successfully" } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.userDeleteFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
