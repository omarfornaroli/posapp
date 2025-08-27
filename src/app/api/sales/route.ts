


import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleTransaction from '@/models/SaleTransaction';
import User from '@/models/User';
import type { SaleTransaction as SaleTransactionType } from '@/types';
import NotificationService from '@/services/notification.service';
import Product from '@/models/Product';
import mongoose from 'mongoose';

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
    const sales = await SaleTransaction.find({}).sort({ date: -1 }); 
    return NextResponse.json({ success: true, data: sales });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  await dbConnect();
  
  try {
    // The body now comes from the sync service, which might have a temporary client-generated ID
    // We remove it so Mongo can generate its own _id
    const { id: tempId, dispatchNow, ...saleData } = await request.json() as Omit<SaleTransactionType, 'id'> & { id?: string, dispatchNow?: boolean };

    const transactionData = {
      ...saleData,
      date: saleData.date ? new Date(saleData.date) : new Date(),
      dispatchStatus: dispatchNow ? 'Dispatched' : 'Pending',
    };
    
    // If dispatching now, update stock within the transaction
    if (dispatchNow) {
      for (const item of transactionData.items) {
        if (item.isService) continue;
        const product = await Product.findById(item.productId);
        if (!product) throw new Error(`Product with ID ${item.productId} not found.`);
        if (product.quantity < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.name}. Required: ${item.quantity}, Available: ${product.quantity}.`);
        }
        product.quantity -= item.quantity;
        await product.save();
        item.dispatchedQuantity = item.quantity; // Mark item as dispatched
      }
    }

    const newSale = await SaleTransaction.create(transactionData);

    const actorDetails = await getActorDetails(request);
    const formattedTotal = `${newSale.currencySymbol || '$'}${newSale.totalAmount.toFixed(newSale.currencyDecimalPlaces || 2)}`;
    await NotificationService.createNotification({
      messageKey: 'Notifications.saleCreated',
      messageParams: { saleId: newSale.id.substring(newSale.id.length - 6).toUpperCase(), totalAmount: formattedTotal },
      type: 'success',
      link: `/receipt/${newSale.id}`,
      ...actorDetails
    });

    if (dispatchNow) {
       await NotificationService.createNotification({
        messageKey: 'Notifications.saleDispatched',
        messageParams: { saleId: newSale.id.substring(newSale.id.length - 6).toUpperCase() },
        type: 'info',
        link: `/dispatches?highlight=${newSale.id}`,
        ...actorDetails,
      });
    }

    return NextResponse.json({ success: true, data: newSale }, { status: 201 });
  } catch (error) {
    console.error("Error creating sale:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during sale creation';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.saleCreateFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
