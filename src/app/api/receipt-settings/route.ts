
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ReceiptSetting, { SINGLETON_KEY } from '@/models/ReceiptSetting';
import User from '@/models/User';
import type { ReceiptSetting as ReceiptSettingType } from '@/types';
import NotificationService from '@/services/notification.service';

const defaultSettings: Omit<ReceiptSettingType, 'id' | 'key'> = {
  logoUrl: '',
  footerText: 'Thank you for your business!',
};

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

export async function GET() {
  await dbConnect();
  try {
    let settings = await ReceiptSetting.findOne({ key: SINGLETON_KEY });
    if (!settings) {
      settings = await ReceiptSetting.create({ key: SINGLETON_KEY, ...defaultSettings });
    }
    return NextResponse.json({ success: true, data: settings.toObject({ virtuals: true }) });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching receipt settings';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json() as Partial<Omit<ReceiptSettingType, 'id' | 'key'>>;
    
    const updatedSettings = await ReceiptSetting.findOneAndUpdate(
      { key: SINGLETON_KEY },
      { $set: body },
      { new: true, upsert: true, runValidators: true }
    );
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.receiptSettingsUpdated',
      type: 'success',
      link: '/settings',
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: updatedSettings.toObject({ virtuals: true }) });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error updating receipt settings';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.receiptSettingsUpdateFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
