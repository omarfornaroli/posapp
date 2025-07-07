
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tax from '@/models/Tax';
import User from '@/models/User';
import type { Tax as TaxType } from '@/types';
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

export async function GET(request: Request, context: { params: { id: string } }) {
  const { id } = context.params;
  await dbConnect();

  try {
    const tax = await Tax.findById(id);
    if (!tax) {
      return NextResponse.json({ success: false, error: 'Tax not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: tax });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

export async function PUT(request: Request, context: { params: { id: string } }) {
  const { id } = context.params;
  await dbConnect();

  try {
    const body = await request.json() as Partial<Omit<TaxType, 'id'>>;
    if (typeof body.rate === 'number' && body.rate > 1) {
        body.rate = body.rate / 100;
    }

    const tax = await Tax.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!tax) {
      return NextResponse.json({ success: false, error: 'Tax not found' }, { status: 404 });
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.taxUpdated',
      messageParams: { taxName: tax.name },
      type: 'success',
      link: `/taxes?highlight=${tax.id}`,
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: tax });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.taxUpdateFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
      return NextResponse.json({ success: false, error: 'Tax name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  const { id } = context.params;
  await dbConnect();

  try {
    const deletedTax = await Tax.findByIdAndDelete(id);
    if (!deletedTax) {
      return NextResponse.json({ success: false, error: 'Tax not found' }, { status: 404 });
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.taxDeleted',
      messageParams: { taxName: deletedTax.name },
      type: 'info',
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: { message: "Tax deleted successfully" } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.taxDeleteFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
