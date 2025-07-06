
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Currency from '@/models/Currency';
import User from '@/models/User';
import type { Currency as CurrencyType } from '@/types';
import mongoose from 'mongoose';
import NotificationService from '@/services/notification.service';

interface Params {
  id: string;
}

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

export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 });
  }
  await dbConnect();
  try {
    const currency = await Currency.findById(id);
    if (!currency) {
      return NextResponse.json({ success: false, error: 'Currency not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: currency });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const { id } = params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 });
  }
  await dbConnect();
  try {
    const body = await request.json() as Partial<Omit<CurrencyType, 'id'>>;

    let notificationMessageKey = 'Notifications.currencyUpdated';
    let notificationType: 'success' | 'info' = 'success';

    if (body.isDefault === true) {
      await Currency.updateMany({ _id: { $ne: id } }, { $set: { isDefault: false } });
      notificationMessageKey = 'Notifications.currencySetDefault';
    }
    
    if (body.hasOwnProperty('isEnabled')) {
        notificationMessageKey = 'Notifications.currencyStatusUpdated';
        notificationType = 'info';
    }

    const updatedCurrency = await Currency.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedCurrency) {
      return NextResponse.json({ success: false, error: 'Currency not found' }, { status: 404 });
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: notificationMessageKey,
      messageParams: { currencyName: updatedCurrency.name, currencyCode: updatedCurrency.code, status: updatedCurrency.isEnabled ? 'enabled' : 'disabled' },
      type: notificationType,
      link: `/currencies?highlight=${updatedCurrency.id}`,
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: updatedCurrency });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.currencyUpdateFailed',
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

export async function DELETE(request: Request, { params }: { params: Params }) {
  const { id } = params;
   if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 });
  }
  await dbConnect();
  try {
    const deletedCurrency = await Currency.findByIdAndDelete(id);
    if (!deletedCurrency) {
      return NextResponse.json({ success: false, error: 'Currency not found' }, { status: 404 });
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.currencyDeleted',
      messageParams: { currencyName: deletedCurrency.name, currencyCode: deletedCurrency.code },
      type: 'info',
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: { message: 'Currency deleted successfully' } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.currencyDeleteFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
