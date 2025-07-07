
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';
import User from '@/models/User';
import type { Product as ProductType } from '@/types';
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

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  await dbConnect();

  try {
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  await dbConnect();

  try {
    const body = await request.json() as Partial<Omit<ProductType, 'id'>>;
    
    const updateData: Partial<ProductType> = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.productGroup !== undefined) updateData.productGroup = body.productGroup?.trim();
    if (body.sku !== undefined) updateData.sku = body.sku?.trim();
    if (body.barcode !== undefined) updateData.barcode = body.barcode.trim();
    if (body.measurementUnit !== undefined) updateData.measurementUnit = body.measurementUnit?.trim();
    if (body.cost !== undefined) updateData.cost = body.cost === null ? undefined : Number(body.cost);
    if (body.markup !== undefined) updateData.markup = body.markup === null ? undefined : Number(body.markup);
    if (body.price !== undefined) updateData.price = Number(body.price);
    if (body.tax !== undefined) updateData.tax = body.tax === null ? undefined : Number(body.tax);
    if (body.isTaxInclusivePrice !== undefined) updateData.isTaxInclusivePrice = !!body.isTaxInclusivePrice;
    if (body.isPriceChangeAllowed !== undefined) updateData.isPriceChangeAllowed = !!body.isPriceChangeAllowed;
    if (body.isUsingDefaultQuantity !== undefined) updateData.isUsingDefaultQuantity = !!body.isUsingDefaultQuantity;
    if (body.isService !== undefined) updateData.isService = !!body.isService;
    if (body.isEnabled !== undefined) updateData.isEnabled = !!body.isEnabled;
    if (body.description !== undefined) updateData.description = body.description?.trim();
    if (body.quantity !== undefined) updateData.quantity = Number(body.quantity);
    if (body.supplier !== undefined) updateData.supplier = body.supplier?.trim();
    if (body.reorderPoint !== undefined) updateData.reorderPoint = body.reorderPoint === null ? undefined : Number(body.reorderPoint);
    if (body.preferredQuantity !== undefined) updateData.preferredQuantity = body.preferredQuantity === null ? undefined : Number(body.preferredQuantity);
    if (body.lowStockWarning !== undefined) updateData.lowStockWarning = !!body.lowStockWarning;
    if (body.warningQuantity !== undefined) updateData.warningQuantity = body.warningQuantity === null ? undefined : Number(body.warningQuantity);
    if (body.category !== undefined) updateData.category = body.category.trim();
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl?.trim() || undefined;


    const product = await Product.findByIdAndUpdate(id, { $set: updateData }, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.productUpdated',
      messageParams: { productName: product.name },
      type: 'success',
      link: `/products?highlight=${product.id}`,
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
     if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
      const field = Object.keys((error as any).keyPattern)[0];
      await NotificationService.createNotification({
        messageKey: 'Notifications.productUpdateFailed',
        messageParams: { error: `Duplicate ${field}` },
        type: 'error',
        ...actorDetails
      });
      return NextResponse.json({ success: false, error: `The ${field} '${(error as any).keyValue[field]}' already exists for another product.` }, { status: 409 });
    }
    await NotificationService.createNotification({
        messageKey: 'Notifications.productUpdateFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
      });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  await dbConnect();

  try {
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.productDeleted',
      messageParams: { productName: deletedProduct.name },
      type: 'info',
      ...actorDetails
    });
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.productDeleteFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
      });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
