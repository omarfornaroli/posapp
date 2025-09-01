
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AiSetting from '@/models/AiSetting';
import { SINGLETON_KEY } from '@/models/AiSetting';
import User from '@/models/User';
import type { AiSetting as AiSettingType } from '@/types';
import NotificationService from '@/services/notification.service';

async function getActorDetails(request: NextRequest) {
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
  const settings = await AiSetting.findOne({ key: SINGLETON_KEY }).select('+geminiApiKey');
  const isKeySet = !!(settings?.geminiApiKey || process.env.GEMINI_API_KEY);
  return NextResponse.json({ success: true, data: { isKeySet } });
}

export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const body = await request.json() as Partial<Omit<AiSettingType, 'id' | 'key'>>;
    
    const updateData: any = { ...body };
    if (body.geminiApiKey === '') {
        delete updateData.geminiApiKey;
    }

    const updatedSettings = await AiSetting.findOneAndUpdate(
      { key: SINGLETON_KEY },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );
    
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Toasts.aiSettingsUpdated',
      type: 'success',
      link: '/settings?tab=ai',
      ...actorDetails
    });
    
    const isKeySet = !!(updatedSettings?.geminiApiKey || process.env.GEMINI_API_KEY);

    return NextResponse.json({ success: true, data: { isKeySet } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error updating AI settings';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Toasts.aiSettingsUpdateFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
