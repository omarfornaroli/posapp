
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import PaymentMethod from '@/models/PaymentMethod';
import User from '@/models/User';
import type { PaymentMethod as PaymentMethodType } from '@/types';
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
    const paymentMethod = await PaymentMethod.findById(id);
    if (!paymentMethod) {
      return NextResponse.json({ success: false, error: 'Payment method not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: paymentMethod });
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
    const body = await request.json() as Partial<Omit<PaymentMethodType, 'id'>>;

    // The logic to convert to Map was incorrect. Mongoose handles plain objects correctly for Map types.
    // The previous implementation was causing the validation to fail.
    // No conversion is needed here. The incoming plain object is correct.

    if (body.isDefault === true) {
      await PaymentMethod.updateMany({ _id: { $ne: id } }, { $set: { isDefault: false } });
    }

    const updatedPaymentMethod = await PaymentMethod.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedPaymentMethod) {
      return NextResponse.json({ success: false, error: 'Payment method not found' }, { status: 404 });
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: body.isDefault === true ? 'Toasts.paymentMethodDefaultSetTitle' : 'Toasts.paymentMethodUpdatedTitle',
      messageParams: { methodName: updatedPaymentMethod.name.get('en') || 'Unknown' },
      type: 'success',
      link: `/payment-methods?highlight=${updatedPaymentMethod.id}`,
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: updatedPaymentMethod });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Toasts.paymentMethodUpdateFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
      return NextResponse.json({ success: false, error: 'Payment method name already exists.' }, { status: 409 });
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
    const deletedPaymentMethod = await PaymentMethod.findByIdAndDelete(id);
    if (!deletedPaymentMethod) {
      return NextResponse.json({ success: false, error: 'Payment method not found' }, { status: 404 });
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Toasts.paymentMethodDeletedTitle',
      messageParams: { methodName: deletedPaymentMethod.name.get('en') || 'Unknown' },
      type: 'info',
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: { message: 'Payment method deleted successfully' } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Toasts.paymentMethodDeleteFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
