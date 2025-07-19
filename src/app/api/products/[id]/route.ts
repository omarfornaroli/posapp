
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

export async function GET(request: Request, { params }: any) {
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

export async function PUT(request: Request, { params }: any) {
  const { id } = params;
  await dbConnect();

  try {
    const body = await request.json() as Partial<Omit<ProductType, 'id'>>;
    
    const updateData: Partial<ProductType> = {};

    // This ensures only fields present in the body are added to the update object
    // Corrected typing for object iteration
    (Object.keys(body) as Array<keyof typeof body>).forEach(key => {
        if (body[key] !== undefined) {
             (updateData as any)[key] = body[key];
        }
    });

    if (body.imageUrl === '') updateData.imageUrl = undefined;
    if (body.cost === null) updateData.cost = undefined;
    if (body.markup === null) updateData.markup = undefined;
    if (body.tax === null) updateData.tax = undefined;
    if (body.reorderPoint === null) updateData.reorderPoint = undefined;
    if (body.preferredQuantity === null) updateData.preferredQuantity = undefined;
    if (body.warningQuantity === null) updateData.warningQuantity = undefined;

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

export async function DELETE(request: Request, { params }: any) {
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
