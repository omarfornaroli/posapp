
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AppLanguage from '@/models/AppLanguage';
import User from '@/models/User';
import type { AppLanguage as AppLanguageType } from '@/types';
import mongoose from 'mongoose';
import NotificationService from '@/services/notification.service';

async function getActorDetails(request: Request) {
  const userEmail = request.headers.get('X-User-Email');
  if (userEmail) {
    const actingUser = await User.findOne({ email: userEmail }).lean();
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
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 });
  }
  await dbConnect();
  try {
    const language = await AppLanguage.findById(id);
    if (!language) {
      return NextResponse.json({ success: false, error: 'Language not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: language });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: any) {
  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 });
  }
  await dbConnect();
  try {
    const body = await request.json() as Partial<Omit<AppLanguageType, 'id'>>;
    let notificationMessageKey = 'Notifications.languageUpdated';
    let notificationType: 'success' | 'info' = 'success';

    if (body.isDefault === true) {
      await AppLanguage.updateMany({ _id: { $ne: id } }, { $set: { isDefault: false } });
      notificationMessageKey = 'Notifications.languageSetDefault';
    } else if (body.isDefault === false) {
      const currentLang = await AppLanguage.findById(id);
      if (currentLang && currentLang.isDefault) {
        const otherEnabledLanguage = await AppLanguage.findOne({ _id: { $ne: id }, isEnabled: true }).sort({ createdAt: 1 });
        if (otherEnabledLanguage) {
          await AppLanguage.findByIdAndUpdate(otherEnabledLanguage._id, { isDefault: true });
        } else {
          return NextResponse.json({ success: false, error: 'Cannot unset the only default language. Enable another language or set it as default first.' }, { status: 400 });
        }
      }
    }
    
    if (body.hasOwnProperty('isEnabled')) {
        notificationMessageKey = 'Notifications.languageStatusUpdated';
        notificationType = 'info';
    }

    const updatedLanguage = await AppLanguage.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedLanguage) {
      return NextResponse.json({ success: false, error: 'Language not found' }, { status: 404 });
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: notificationMessageKey,
      messageParams: { langName: updatedLanguage.name, status: updatedLanguage.isEnabled ? 'enabled' : 'disabled' }, // Add status for status update
      type: notificationType,
      link: `/languages?highlight=${updatedLanguage.id}`,
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: updatedLanguage });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.languageUpdateFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
      return NextResponse.json({ success: false, error: 'Language code already exists.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: any) {
  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 });
  }
  await dbConnect();
  try {
    const languageToDelete = await AppLanguage.findById(id);
    if (!languageToDelete) {
      return NextResponse.json({ success: false, error: 'Language not found' }, { status: 404 });
    }

    if (languageToDelete.isDefault) {
        const count = await AppLanguage.countDocuments({isEnabled: true});
        if (count <=1) {
             return NextResponse.json({ success: false, error: 'Cannot delete the only enabled default language.' }, { status: 400 });
        }
      const otherEnabledLanguage = await AppLanguage.findOne({ _id: { $ne: id }, isEnabled: true }).sort({createdAt: 1});
      if (otherEnabledLanguage) {
        await AppLanguage.findByIdAndUpdate(otherEnabledLanguage._id, { isDefault: true });
      } else {
        return NextResponse.json({ success: false, error: 'Cannot delete default language if no other enabled language to set as default.' }, { status: 400 });
      }
    }

    await AppLanguage.findByIdAndDelete(id);
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.languageDeleted',
      messageParams: { langName: languageToDelete.name },
      type: 'info',
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: { message: 'Language deleted successfully' } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
     await NotificationService.createNotification({
        messageKey: 'Notifications.languageDeleteFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
