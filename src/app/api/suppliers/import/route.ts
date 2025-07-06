
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Supplier from '@/models/Supplier';
import User from '@/models/User';
import type { Supplier as SupplierType } from '@/types';
import NotificationService from '@/services/notification.service';

interface ImportRequestBody {
  suppliers: Partial<SupplierType>[];
  settings: {
    conflictResolution: 'skip' | 'overwrite';
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

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json() as ImportRequestBody;
    const { suppliers: suppliersToImport, settings } = body;

    if (!suppliersToImport || !Array.isArray(suppliersToImport)) {
      return NextResponse.json({ success: false, error: 'Invalid supplier data provided.' }, { status: 400 });
    }
    if (!settings || !settings.conflictResolution) {
      return NextResponse.json({ success: false, error: 'Invalid import settings.' }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: { supplierName?: string; error: string }[] = [];
    
    for (const rawSupplier of suppliersToImport) {
      try {
        if (!rawSupplier.name) {
          errors.push({ supplierName: rawSupplier.name, error: 'Missing name.' });
          errorCount++;
          continue;
        }

        const supplierData = {
          name: rawSupplier.name.trim(),
          contactPerson: rawSupplier.contactPerson?.trim(),
          email: rawSupplier.email?.toLowerCase().trim(),
          phone: rawSupplier.phone?.trim(),
          address: rawSupplier.address?.trim(),
          website: rawSupplier.website?.trim(),
          notes: rawSupplier.notes?.trim(),
          isEnabled: rawSupplier.isEnabled !== false,
        };

        const existingSupplier = await Supplier.findOne({ name: supplierData.name });

        if (existingSupplier) {
          if (settings.conflictResolution === 'skip') {
            skippedCount++;
            continue;
          } else if (settings.conflictResolution === 'overwrite') {
            await Supplier.updateOne({ _id: existingSupplier._id }, { $set: supplierData }, { runValidators: true });
            updatedCount++;
          }
        } else {
          await Supplier.create(supplierData);
          createdCount++;
        }
      } catch (e: any) {
        errorCount++;
        errors.push({ supplierName: rawSupplier.name, error: e.message || 'Unknown error during import of this supplier.' });
      }
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.supplierImportSummary', 
      messageParams: { created: createdCount, updated: updatedCount, skipped: skippedCount, errors: errorCount },
      type: errorCount > 0 ? 'warning' : 'success',
      link: '/suppliers',
      ...actorDetails
    });

    return NextResponse.json({
      success: true,
      data: { createdCount, updatedCount, skippedCount, errorCount, errors: errorCount > 0 ? errors : undefined, }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during import process.';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.supplierImportFailed',
      messageParams: { error: errorMessage },
      type: 'error',
      ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
