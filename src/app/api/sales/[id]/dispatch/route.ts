
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleTransaction from '@/models/SaleTransaction';
import Product from '@/models/Product';
import mongoose from 'mongoose';
import NotificationService from '@/services/notification.service';
import User from '@/models/User';
import type { CartItem, SaleTransaction as SaleTransactionType } from '@/types';

interface DispatchItem {
  productId: string;
  quantity: number;
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

export async function POST(request: Request, { params }: any) {
  const { id } = params;
  const body = await request.json();
  const { itemsToDispatch }: { itemsToDispatch: DispatchItem[] } = body;

  if (!itemsToDispatch || !Array.isArray(itemsToDispatch) || itemsToDispatch.length === 0) {
    return NextResponse.json({ success: false, error: 'No items provided for dispatch.' }, { status: 400 });
  }

  if (itemsToDispatch.some(item => typeof item.quantity !== 'number' || item.quantity < 0)) {
     return NextResponse.json({ success: false, error: 'Invalid quantity provided for one or more items.' }, { status: 400 });
  }
  
  const validItems = itemsToDispatch.filter(item => item.quantity > 0);
  if (validItems.length === 0) {
    return NextResponse.json({ success: false, error: 'No items with a dispatch quantity greater than zero.' }, { status: 400 });
  }

  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await SaleTransaction.findById(id).session(session);

    if (!sale) {
      throw new Error('Sale transaction not found');
    }

    if (sale.dispatchStatus === 'Dispatched') {
      throw new Error('This sale has already been fully dispatched.');
    }

    for (const dispatchItem of validItems) {
      const saleItem = sale.items.find(item => item.productId === dispatchItem.productId);

      if (!saleItem) {
        throw new Error(`Product with ID ${dispatchItem.productId} not found in this sale.`);
      }

      const remainingToDispatch = (saleItem.quantity || 0) - (saleItem.dispatchedQuantity || 0);
      if (dispatchItem.quantity > remainingToDispatch) {
        throw new Error(`Cannot dispatch ${dispatchItem.quantity} of ${saleItem.name}. Only ${remainingToDispatch} remaining.`);
      }

      if (!saleItem.barcode) {
        // Services might not have a barcode, skip stock deduction for them.
        if (!saleItem.isService) {
           throw new Error(`Product "${saleItem.name}" in this sale is missing a barcode and cannot be dispatched.`);
        }
      }

      // Only deduct stock for non-service items
      if (!saleItem.isService && saleItem.barcode) {
        const product = await Product.findOne({ barcode: saleItem.barcode }).session(session);
        if (!product) {
          throw new Error(`Product with barcode ${saleItem.barcode} (${saleItem.name}) not found in inventory.`);
        }

        if (product.quantity < dispatchItem.quantity) {
          throw new Error(`Insufficient stock for product: ${product.name}. Required: ${dispatchItem.quantity}, Available: ${product.quantity}.`);
        }
        
        product.quantity -= dispatchItem.quantity;
        await product.save({ session });
      }
      
      saleItem.dispatchedQuantity = (saleItem.dispatchedQuantity || 0) + dispatchItem.quantity;
    }

    const allItemsFullyDispatched = sale.items.every(item => item.dispatchedQuantity === item.quantity);
    
    if (allItemsFullyDispatched) {
      sale.dispatchStatus = 'Dispatched';
    } else {
      sale.dispatchStatus = 'Partially Dispatched';
    }

    await sale.save({ session });
    
    await session.commitTransaction();

    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: allItemsFullyDispatched ? 'Notifications.saleFullyDispatched' : 'Notifications.salePartiallyDispatched',
      messageParams: { saleId: sale.id.substring(sale.id.length - 6).toUpperCase() },
      type: 'success',
      link: `/dispatches?highlight=${sale.id}`,
      ...actorDetails,
    });
    
    return NextResponse.json({ success: true, data: sale.toObject() });

  } catch (error) {
    await session.abortTransaction();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during dispatch.';
    console.error(`[API/sales/${id}/dispatch POST] Error:`, error);
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.saleDispatchFailed',
      messageParams: { saleId: id.substring(id.length - 6).toUpperCase(), error: errorMessage },
      type: 'error',
      ...actorDetails,
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  } finally {
    session.endSession();
  }
}

    