
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import PaymentMethod from '@/models/PaymentMethod';
import User from '@/models/User';
import type { PaymentMethod as PaymentMethodType } from '@/types';
import NotificationService from '@/services/notification.service';

interface ImportRequestBody {
  paymentMethods: Partial<PaymentMethodType>[];
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
    const { paymentMethods: methodsToImport, settings } = body;

    if (!methodsToImport || !Array.isArray(methodsToImport)) {
      return NextResponse.json({ success: false, error: 'Invalid payment method data provided.' }, { status: 400 });
    }
    if (!settings || !settings.conflictResolution) {
      return NextResponse.json({ success: false, error: 'Invalid import settings.' }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: { methodName?: string; error: string }[] = [];
    
    for (const rawMethod of methodsToImport) {
      try {
        if (!rawMethod.name) {
          errors.push({ methodName: rawMethod.name, error: 'Missing name.' });
          errorCount++;
          continue;
        }

        const methodData = {
          name: rawMethod.name.trim(),
          description: rawMethod.description?.trim(),
          isEnabled: rawMethod.isEnabled !== false,
          isDefault: !!rawMethod.isDefault,
        };

        const existingMethod = await PaymentMethod.findOne({ name: methodData.name });

        if (existingMethod) {
          if (settings.conflictResolution === 'skip') {
            skippedCount++;
            continue;
          } else if (settings.conflictResolution === 'overwrite') {
            await PaymentMethod.updateOne({ _id: existingMethod._id }, { $set: methodData }, { runValidators: true });
            updatedCount++;
          }
        } else {
          await PaymentMethod.create(methodData);
          createdCount++;
        }
      } catch (e: any) {
        errorCount++;
        errors.push({ methodName: rawMethod.name, error: e.message || 'Unknown error during import of this method.' });
      }
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.paymentMethodImportSummary', 
      messageParams: { created: createdCount, updated: updatedCount, skipped: skippedCount, errors: errorCount },
      type: errorCount > 0 ? 'warning' : 'success',
      link: '/payment-methods',
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
      messageKey: 'Notifications.paymentMethodImportFailed',
      messageParams: { error: errorMessage },
      type: 'error',
      ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
