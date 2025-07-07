
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Product from '@/models/Product';
import User from '@/models/User';
import type { Product as ProductType } from '@/types';
import NotificationService from '@/services/notification.service';

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
    const products = await Product.find({});
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const body = await request.json() as Omit<ProductType, 'id'>;
    
    const productData: Partial<ProductType> = {
      ...body,
      name: body.name.trim(),
      barcode: body.barcode.trim(),
      category: body.category.trim(),
      sku: body.sku?.trim(),
      productGroup: body.productGroup?.trim(),
      measurementUnit: body.measurementUnit?.trim(),
      supplier: body.supplier?.trim(),
      cost: body.cost !== undefined && body.cost !== null ? Number(body.cost) : undefined,
      markup: body.markup !== undefined && body.markup !== null ? Number(body.markup) : undefined,
      price: Number(body.price),
      tax: body.tax !== undefined && body.tax !== null ? Number(body.tax) : undefined,
      quantity: Number(body.quantity),
      reorderPoint: body.reorderPoint !== undefined && body.reorderPoint !== null ? Number(body.reorderPoint) : undefined,
      preferredQuantity: body.preferredQuantity !== undefined && body.preferredQuantity !== null ? Number(body.preferredQuantity) : undefined,
      warningQuantity: body.warningQuantity !== undefined && body.warningQuantity !== null ? Number(body.warningQuantity) : undefined,
      isTaxInclusivePrice: !!body.isTaxInclusivePrice,
      isPriceChangeAllowed: body.isPriceChangeAllowed === undefined ? true : !!body.isPriceChangeAllowed,
      isUsingDefaultQuantity: body.isUsingDefaultQuantity === undefined ? true : !!body.isUsingDefaultQuantity,
      isService: !!body.isService,
      isEnabled: body.isEnabled === undefined ? true : !!body.isEnabled,
      lowStockWarning: !!body.lowStockWarning,
      imageUrl: body.imageUrl?.trim() || undefined,
      description: body.description?.trim(),
    };
    
    const product = await Product.create(productData);
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.productCreated',
      messageParams: { productName: product.name },
      type: 'success',
      link: `/products?highlight=${product.id}`,
      ...actorDetails
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const actorDetails = await getActorDetails(request);
    if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
      const field = Object.keys((error as any).keyPattern)[0];
      return NextResponse.json({ success: false, error: `The ${field} '${(error as any).keyValue[field]}' already exists.` }, { status: 409 });
    }
    await NotificationService.createNotification({
      messageKey: 'Notifications.productCreateFailed',
      messageParams: { error: errorMessage },
      type: 'error',
      ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
