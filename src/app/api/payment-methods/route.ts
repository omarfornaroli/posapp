
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import PaymentMethod from '@/models/PaymentMethod';
import User from '@/models/User';
import type { PaymentMethod as PaymentMethodType } from '@/types';
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
    const paymentMethods = await PaymentMethod.find({}).sort({ name: 1 });
    return NextResponse.json({ success: true, data: paymentMethods });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json() as Omit<PaymentMethodType, 'id'>;

    // Convert plain objects back to Maps for Mongoose
    if (body.name && typeof body.name === 'object' && !(body.name instanceof Map)) {
        body.name = new Map(Object.entries(body.name));
    }
    if (body.description && typeof body.description === 'object' && !(body.description instanceof Map)) {
        body.description = new Map(Object.entries(body.description));
    }
    
    if (body.isDefault) {
      await PaymentMethod.updateMany({}, { $set: { isDefault: false } });
    }

    const newPaymentMethod = await PaymentMethod.create(body);
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Toasts.paymentMethodAddedTitle',
      messageParams: { methodName: newPaymentMethod.name.get('en') || 'Unknown' },
      type: 'success',
      link: `/payment-methods?highlight=${newPaymentMethod.id}`,
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: newPaymentMethod }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Toasts.paymentMethodCreateFailed',
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
