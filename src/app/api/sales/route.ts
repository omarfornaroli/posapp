

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
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const body = await request.json() as Omit<SaleTransactionType, 'id'> & { dispatchNow?: boolean };
    const { dispatchNow, ...saleData } = body;

    const itemsForDb = saleData.items.map(item => ({
        productId: item.id, 
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category: item.category,
        imageUrl: item.imageUrl,
        barcode: item.barcode,
        itemDiscountType: item.itemDiscountType,
        itemDiscountValue: item.itemDiscountValue,
    }));

     const appliedTaxesForDb = saleData.appliedTaxes.map(tax => ({
        taxId: tax.taxId, 
        name: tax.name,
        rate: tax.rate,
        amount: tax.amount,
    }));

    const appliedPromotionsForDb = saleData.appliedPromotions?.map(promo => ({
      promotionId: promo.promotionId,
      name: promo.name,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      amountDeducted: promo.amountDeducted,
    })) || [];

    const appliedPaymentsForDb = saleData.appliedPayments.map(p => ({
        methodId: p.methodId,
        methodName: p.methodName,
        amount: p.amount,
    }));

    const transactionData = {
      ...saleData,
      items: itemsForDb,
      appliedTaxes: appliedTaxesForDb,
      appliedPromotions: appliedPromotionsForDb,
      appliedPayments: appliedPaymentsForDb,
      date: saleData.date ? new Date(saleData.date) : new Date(),
      dispatchStatus: dispatchNow ? 'Dispatched' : 'Pending',
    };
    
    // If dispatching now, update stock within the transaction
    if (dispatchNow) {
      for (const item of transactionData.items) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) throw new Error(`Product with ID ${item.productId} not found.`);
        if (product.quantity < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.name}. Required: ${item.quantity}, Available: ${product.quantity}.`);
        }
        product.quantity -= item.quantity;
        await product.save({ session });
      }
    }

    const newSaleArray = await SaleTransaction.create([transactionData], { session });
    const newSale = newSaleArray[0];

    await session.commitTransaction();

    const actorDetails = await getActorDetails(request);
    const formattedTotal = `${body.currencySymbol || '$'}${newSale.totalAmount.toFixed(body.currencyDecimalPlaces || 2)}`;
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
    await session.abortTransaction();
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
  } finally {
    session.endSession();
  }
}
