
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tax from '@/models/Tax';
import User from '@/models/User';
import NotificationService from '@/services/notification.service';
import type { Tax as TaxType } from '@/types';

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
    const taxes = await Tax.find({}).sort({ name: 1 });
    return NextResponse.json({ success: true, data: taxes });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json() as Omit<TaxType, 'id'>; // Can be a single tax
    
    // If rate is provided as percentage, convert to decimal
    if (typeof body.rate === 'number' && body.rate > 1) {
        body.rate = body.rate / 100;
    }

    const createdTax = await Tax.create(body);
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.taxCreated',
      messageParams: { taxName: createdTax.name },
      type: 'success',
      link: `/taxes?highlight=${createdTax.id}`,
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: createdTax }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.taxCreateFailed',
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
