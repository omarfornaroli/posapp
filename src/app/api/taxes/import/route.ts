
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tax from '@/models/Tax';
import User from '@/models/User';
import type { Tax as TaxType } from '@/types';
import NotificationService from '@/services/notification.service';

interface ImportRequestBody {
  taxes: Partial<TaxType>[];
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
    const { taxes: taxesToImport, settings } = body;

    if (!taxesToImport || !Array.isArray(taxesToImport)) {
      return NextResponse.json({ success: false, error: 'Invalid tax data provided.' }, { status: 400 });
    }
    if (!settings || !settings.conflictResolution) {
      return NextResponse.json({ success: false, error: 'Invalid import settings.' }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: { taxName?: string; error: string }[] = [];
    
    for (const rawTax of taxesToImport) {
      try {
        if (!rawTax.name || rawTax.rate === undefined) {
          errors.push({ taxName: rawTax.name, error: 'Missing name or rate.' });
          errorCount++;
          continue;
        }

        const taxData = {
          name: rawTax.name.trim(),
          rate: Number(rawTax.rate) > 1 ? Number(rawTax.rate) / 100 : Number(rawTax.rate), // Handle both percentage and decimal
          description: rawTax.description?.trim(),
        };

        const existingTax = await Tax.findOne({ name: taxData.name });

        if (existingTax) {
          if (settings.conflictResolution === 'skip') {
            skippedCount++;
            continue;
          } else if (settings.conflictResolution === 'overwrite') {
            await Tax.updateOne({ _id: existingTax._id }, { $set: taxData }, { runValidators: true });
            updatedCount++;
          }
        } else {
          await Tax.create(taxData);
          createdCount++;
        }
      } catch (e: any) {
        errorCount++;
        errors.push({ taxName: rawTax.name, error: e.message || 'Unknown error during import of this tax.' });
      }
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.taxImportSummary', 
      messageParams: { created: createdCount, updated: updatedCount, skipped: skippedCount, errors: errorCount },
      type: errorCount > 0 ? 'warning' : 'success',
      link: '/taxes',
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
      messageKey: 'Notifications.taxImportFailed',
      messageParams: { error: errorMessage },
      type: 'error',
      ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
