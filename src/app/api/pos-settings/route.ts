
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import POSSetting from '@/models/POSSetting';
import { SINGLETON_KEY } from '@/models/POSSetting';
import User from '@/models/User';
import type { POSSetting as POSSettingType } from '@/types';
import NotificationService from '@/services/notification.service';

const defaultSettings: Partial<Omit<POSSettingType, 'id' | 'key'>> = {
  requireAuthForCartItemRemoval: true,
  dispatchAtSaleDefault: true,
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
    let settings = await POSSetting.findOne({ key: SINGLETON_KEY });
    if (!settings) {
      settings = await POSSetting.create({ key: SINGLETON_KEY, ...defaultSettings });
    }
    return NextResponse.json({ success: true, data: settings.toObject({ virtuals: true }) });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching POS settings';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json() as Partial<Omit<POSSettingType, 'id' | 'key'>>;
    
    const updatedSettings = await POSSetting.findOneAndUpdate(
      { key: SINGLETON_KEY },
      { $set: body },
      { new: true, upsert: true, runValidators: true }
    );
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.posSettingsUpdated', // This key needs to be added to translation files
      type: 'success',
      link: '/settings',
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: updatedSettings.toObject({ virtuals: true }) });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error updating POS settings';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.posSettingsUpdateFailed', // This key needs to be added to translation files
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
