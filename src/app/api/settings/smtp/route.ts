
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SmtpSettingModel, { SINGLETON_KEY } from '@/models/SmtpSetting';
import User from '@/models/User';
import NotificationService from '@/services/notification.service';
import type { SmtpSetting } from '@/types';

const defaultSettings: Omit<SmtpSetting, 'id' | 'key' | 'pass'> = {
  host: '',
  port: 587,
  user: '',
  from: '',
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
    let settings = await SmtpSettingModel.findOne({ key: SINGLETON_KEY });
    if (!settings) {
      settings = await SmtpSettingModel.create({ key: SINGLETON_KEY, ...defaultSettings });
    }
    const { pass, ...settingsWithoutPass } = settings.toObject({ virtuals: true });
    
    // Check if essential settings are configured
    const isConfigured = !!(settings.host && settings.port && settings.user);

    return NextResponse.json({ success: true, data: { ...settingsWithoutPass, isConfigured } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching SMTP settings';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json() as Partial<Omit<SmtpSetting, 'id' | 'key'>>;
    
    const updateData: any = { ...body };
    if (body.pass === '') {
        delete updateData.pass;
    }

    const updatedSettings = await SmtpSettingModel.findOneAndUpdate(
      { key: SINGLETON_KEY },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );
    
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.smtpSettingsUpdated',
      type: 'success',
      link: '/settings',
      ...actorDetails
    });
    
    const { pass, ...settingsWithoutPass } = updatedSettings.toObject({ virtuals: true });
    const isConfigured = !!(updatedSettings.host && updatedSettings.port && updatedSettings.user && updatedSettings.pass);

    return NextResponse.json({ success: true, data: { ...settingsWithoutPass, isConfigured } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error updating SMTP settings';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.smtpSettingsUpdateFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
