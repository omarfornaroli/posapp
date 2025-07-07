
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Promotion from '@/models/Promotion';
import User from '@/models/User';
import type { Promotion as PromotionType } from '@/types';
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
  await dbConnect();

  try {
    const promotion = await Promotion.findById(id);
    if (!promotion) {
      return NextResponse.json({ success: false, error: 'Promotion not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: promotion });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

export async function PUT(request: Request, { params }: any) {
  const { id } = params;
  await dbConnect();

  try {
    const body = await request.json() as Partial<Omit<PromotionType, 'id'>>;
    const promotion = await Promotion.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!promotion) {
      return NextResponse.json({ success: false, error: 'Promotion not found' }, { status: 404 });
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.promotionUpdated',
      messageParams: { promotionName: promotion.name },
      type: 'success',
      link: `/promotions?highlight=${promotion.id}`,
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: promotion });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.promotionUpdateFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
     if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
      return NextResponse.json({ success: false, error: 'Promotion name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: any) {
  const { id } = params;
  await dbConnect();

  try {
    const deletedPromotion = await Promotion.findByIdAndDelete(id);
    if (!deletedPromotion) {
      return NextResponse.json({ success: false, error: 'Promotion not found' }, { status: 404 });
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.promotionDeleted',
      messageParams: { promotionName: deletedPromotion.name },
      type: 'info',
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: { message: "Promotion deleted successfully" } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.promotionDeleteFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
