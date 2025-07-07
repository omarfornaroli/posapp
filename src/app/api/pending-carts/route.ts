
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import PendingCart from '@/models/PendingCart';
import User from '@/models/User';
import type { PendingCart as PendingCartType } from '@/types';
import mongoose from 'mongoose';

async function getActorDetails(request: NextRequest) {
  const userEmail = request.headers.get('X-User-Email');
  if (userEmail) {
    const actingUser = await User.findOne({ email: userEmail }).lean();
    if (actingUser) {
      return {
        actorId: actingUser._id as mongoose.Types.ObjectId,
        actorName: actingUser.name,
      };
    }
  }
  return { actorId: null, actorName: 'Unknown' };
}


export async function GET(request: NextRequest) {
  await dbConnect();
  try {
    const pendingCarts = await PendingCart.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: pendingCarts });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching pending carts';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const body: Omit<PendingCartType, 'id' | 'createdAt' | 'updatedAt'> = await request.json();
    const { actorId, actorName } = await getActorDetails(request);
    
    const cartData = {
        ...body,
        createdBy: actorId ? { id: actorId.toString(), name: actorName } : undefined,
    };

    const newPendingCart = await PendingCart.create(cartData);

    return NextResponse.json({ success: true, data: newPendingCart }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error creating pending cart';
    console.error('Error creating pending cart:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
