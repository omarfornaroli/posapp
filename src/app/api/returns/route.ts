
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Return from '@/models/Return';
import Product from '@/models/Product';
import SaleTransaction from '@/models/SaleTransaction';
import User from '@/models/User';
import NotificationService from '@/services/notification.service';
import mongoose from 'mongoose';
import type { Return as ReturnType, ReturnItem } from '@/types';

async function getActorDetails(request: NextRequest) {
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

export async function GET(request: NextRequest) {
  await dbConnect();
  try {
    const returns = await Return.find({}).sort({ returnDate: -1 });
    return NextResponse.json({ success: true, data: returns });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const body = await request.json() as Omit<ReturnType, 'id'> & { id?: string };
    
    // Check if original sale exists
    const originalSale = await SaleTransaction.findById(body.originalSaleId).session(session);
    if (!originalSale) {
      throw new Error(`Original sale with ID ${body.originalSaleId} not found.`);
    }

    // Validate returned items against the original sale
    for (const returnItem of body.items) {
      const originalItem = originalSale.items.find(item => item.productId === returnItem.productId);
      if (!originalItem) {
        throw new Error(`Product ${returnItem.name} was not part of the original sale.`);
      }
      if (returnItem.quantity > originalItem.quantity) {
        throw new Error(`Cannot return more ${returnItem.name} than were purchased.`);
      }
    }

    // Create the return document
    const newReturn = new Return(body);
    await newReturn.save({ session });

    // Update stock quantities for returned products
    for (const item of body.items) {
      if (!item.isService) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { quantity: item.quantity } },
          { session }
        );
      }
    }

    await session.commitTransaction();
    session.endSession();
    
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.returnCreated',
      messageParams: { returnId: newReturn.id.substring(newReturn.id.length - 6).toUpperCase(), saleId: newReturn.originalSaleId.substring(newReturn.originalSaleId.length - 6).toUpperCase() },
      type: 'success',
      link: `/returns`,
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: newReturn }, { status: 201 });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during return processing';
    console.error("Error creating return:", error);
    const actorDetails = await getActorDetails(request);
     await NotificationService.createNotification({
        messageKey: 'Notifications.returnCreateFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });

    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
