
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Country from '@/models/Country';
import User from '@/models/User';
import type { Country as CountryType } from '@/types';
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
    const country = await Country.findById(id);
    if (!country) {
      return NextResponse.json({ success: false, error: 'Country not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: country });
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
    const body = await request.json() as Partial<Omit<CountryType, 'id'>>;

    let notificationMessageKey = 'Notifications.countryUpdated';
    let notificationType: 'success' | 'info' = 'success';

    if (body.isDefault === true) {
      await Country.updateMany({ _id: { $ne: id } }, { $set: { isDefault: false } });
      notificationMessageKey = 'Notifications.countrySetDefault';
    }
    
    if (body.hasOwnProperty('isEnabled')) {
        notificationMessageKey = 'Notifications.countryStatusUpdated';
        notificationType = 'info';
    }

    const updatedCountry = await Country.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedCountry) {
      return NextResponse.json({ success: false, error: 'Country not found' }, { status: 404 });
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: notificationMessageKey,
      messageParams: { countryName: updatedCountry.name, status: updatedCountry.isEnabled ? 'enabled' : 'disabled' },
      type: notificationType,
      link: `/countries?highlight=${updatedCountry.id}`,
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: updatedCountry });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.countryUpdateFailed',
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

export async function DELETE(request: Request, { params }: any) {
  const { id } = params;
   if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 });
  }
  await dbConnect();
  try {
    const deletedCountry = await Country.findByIdAndDelete(id);
    if (!deletedCountry) {
      return NextResponse.json({ success: false, error: 'Country not found' }, { status: 404 });
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.countryDeleted',
      messageParams: { countryName: deletedCountry.name },
      type: 'info',
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: { message: 'Country deleted successfully' } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.countryDeleteFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
