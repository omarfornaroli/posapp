
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/models/User';
import type { User as UserType } from '@/types';
import NotificationService from '@/services/notification.service';

interface ImportRequestBody {
  users: Partial<UserType>[];
  settings: {
    conflictResolution: 'skip' | 'overwrite';
  };
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

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json() as ImportRequestBody;
    const { users: usersToImport, settings } = body;

    if (!usersToImport || !Array.isArray(usersToImport)) {
      return NextResponse.json({ success: false, error: 'Invalid user data provided.' }, { status: 400 });
    }
    if (!settings || !settings.conflictResolution) {
      return NextResponse.json({ success: false, error: 'Invalid import settings.' }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: { userEmail?: string; userName?: string; error: string }[] = [];
    
    for (const rawUser of usersToImport) {
      try {
        if (!rawUser.email || !rawUser.name || !rawUser.role) {
          errors.push({ userName: rawUser.name, userEmail: rawUser.email, error: 'Missing name, email, or role.' });
          errorCount++;
          continue;
        }

        const userData = {
          name: rawUser.name.trim(),
          email: rawUser.email.toLowerCase().trim(),
          role: rawUser.role,
          joinDate: rawUser.joinDate || new Date().toISOString(),
          imageUrl: rawUser.imageUrl?.trim(),
        };

        const existingUser = await UserModel.findOne({ email: userData.email });

        if (existingUser) {
          if (settings.conflictResolution === 'skip') {
            skippedCount++;
            continue;
          } else if (settings.conflictResolution === 'overwrite') {
            const { id, _id, __v, createdAt, updatedAt, permissions, ...updateData } = userData as any;
            await UserModel.updateOne({ _id: existingUser._id }, { $set: updateData }, { runValidators: true });
            updatedCount++;
          }
        } else {
          await UserModel.create(userData);
          createdCount++;
        }
      } catch (e: any) {
        errorCount++;
        errors.push({ userEmail: rawUser.email, userName: rawUser.name, error: e.message || 'Unknown error during import of this user.' });
      }
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.userImportSummary', 
      messageParams: { created: createdCount, updated: updatedCount, skipped: skippedCount, errors: errorCount },
      type: errorCount > 0 ? 'warning' : 'success',
      link: '/users',
      ...actorDetails
    });

    return NextResponse.json({
      success: true,
      data: { createdCount, updatedCount, skippedCount, errorCount, errors: errorCount > 0 ? errors : undefined, }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during import process.';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.userImportFailed',
      messageParams: { error: errorMessage },
      type: 'error',
      ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
