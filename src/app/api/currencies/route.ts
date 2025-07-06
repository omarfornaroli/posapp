
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Currency from '@/models/Currency';
import User from '@/models/User';
import type { Currency as CurrencyType } from '@/types';
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

export async function GET() {
  await dbConnect();
  try {
    const currencies = await Currency.find({}).sort({ name: 1 });
    return NextResponse.json({ success: true, data: currencies });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json() as Omit<CurrencyType, 'id'>;
    
    if (body.isDefault) {
      await Currency.updateMany({}, { $set: { isDefault: false } });
    }

    const newCurrency = await Currency.create(body);
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.currencyCreated',
      messageParams: { currencyName: newCurrency.name, currencyCode: newCurrency.code },
      type: 'success',
      link: `/currencies?highlight=${newCurrency.id}`,
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: newCurrency }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.currencyCreateFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
      return NextResponse.json({ success: false, error: 'Currency code already exists.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
