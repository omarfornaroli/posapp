
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Country from '@/models/Country';
import User from '@/models/User';
import type { Country as CountryType } from '@/types';
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
    const countries = await Country.find({}).sort({ name: 1 });
    return NextResponse.json({ success: true, data: countries });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json() as Omit<CountryType, 'id'>;
    
    if (body.isDefault) {
      await Country.updateMany({}, { $set: { isDefault: false } });
    }

    const newCountry = await Country.create(body);
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.countryCreated',
      messageParams: { countryName: newCountry.name },
      type: 'success',
      link: `/countries?highlight=${newCountry.id}`,
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: newCountry }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.countryCreateFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
      const field = Object.keys((error as any).keyPattern)[0];
      return NextResponse.json({ success: false, error: `Country with this ${field} already exists.` }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
