// src/app/api/suppliers/[id]/update-costs/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Supplier from '@/models/Supplier';
import Product from '@/models/Product';
import User from '@/models/User';
import NotificationService from '@/services/notification.service';
import mongoose from 'mongoose';

interface UpdateCostsRequestBody {
  data: Record<string, any>[];
  mappings: {
    identifierColumn: string;
    identifierType: 'barcode' | 'sku';
    costColumn: string;
  };
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

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { id: supplierId } = params;

  if (!mongoose.Types.ObjectId.isValid(supplierId)) {
    return NextResponse.json({ success: false, error: 'Invalid Supplier ID format' }, { status: 400 });
  }

  await dbConnect();

  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found.' }, { status: 404 });
    }

    const body: UpdateCostsRequestBody = await request.json();
    const { data, mappings } = body;

    if (!data || !Array.isArray(data) || !mappings || !mappings.identifierColumn || !mappings.costColumn || !mappings.identifierType) {
      return NextResponse.json({ success: false, error: 'Invalid request body. Missing data or mappings.' }, { status: 400 });
    }
    
    let updatedCount = 0;
    let notFoundCount = 0;
    let invalidCostCount = 0;
    
    const bulkOps = [];

    for (const row of data) {
      const identifier = row[mappings.identifierColumn];
      const newCost = parseFloat(String(row[mappings.costColumn]).replace(/,/g, '.')); // Handle comma decimals

      if (!identifier) continue; 
      
      if (isNaN(newCost) || newCost < 0) {
        invalidCostCount++;
        continue;
      }
      
      bulkOps.push({
        updateMany: {
          filter: { 
            // Find products by their unique identifier, regardless of current supplier
            [mappings.identifierType]: identifier 
          },
          // Update the cost and also assign the product to this supplier
          update: { $set: { cost: newCost, supplier: new mongoose.Types.ObjectId(supplierId) } }
        }
      });
    }

    if(bulkOps.length > 0) {
      const result = await Product.bulkWrite(bulkOps, { ordered: false });
      updatedCount = result.modifiedCount;
    }
    
    const totalPossibleUpdates = data.length - invalidCostCount;
    notFoundCount = Math.max(0, totalPossibleUpdates - updatedCount);
    
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.supplierCostsUpdated',
      messageParams: { 
          supplierName: supplier.name, 
          updated: updatedCount, 
          notFound: notFoundCount, 
          invalid: invalidCostCount 
        },
      type: 'info',
      link: `/suppliers?highlight=${supplierId}`,
      ...actorDetails
    });

    return NextResponse.json({ 
        success: true, 
        data: {
            updatedCount,
            notFoundCount,
            invalidCostCount
        }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during cost update process.';
    console.error(`Error updating costs for supplier ${supplierId}:`, error);
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.supplierCostsUpdateFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
