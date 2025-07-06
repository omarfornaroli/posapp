
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Promotion from '@/models/Promotion';
import User from '@/models/User';
import type { Promotion as PromotionType } from '@/types';
import NotificationService from '@/services/notification.service';

interface ImportRequestBody {
  promotions: Partial<PromotionType>[];
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
    const { promotions: promotionsToImport, settings } = body;

    if (!promotionsToImport || !Array.isArray(promotionsToImport)) {
      return NextResponse.json({ success: false, error: 'Invalid promotion data provided.' }, { status: 400 });
    }
    if (!settings || !settings.conflictResolution) {
      return NextResponse.json({ success: false, error: 'Invalid import settings.' }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: { promotionName?: string; error: string }[] = [];
    
    for (const rawPromo of promotionsToImport) {
      try {
        if (!rawPromo.name || !rawPromo.discountType || rawPromo.discountValue === undefined || !rawPromo.startDate) {
          errors.push({ promotionName: rawPromo.name, error: 'Missing required fields: name, discountType, discountValue, startDate.' });
          errorCount++;
          continue;
        }

        const promoData = {
          name: rawPromo.name.trim(),
          description: rawPromo.description?.trim(),
          discountType: rawPromo.discountType,
          discountValue: Number(rawPromo.discountValue),
          startDate: new Date(rawPromo.startDate).toISOString(),
          endDate: rawPromo.endDate ? new Date(rawPromo.endDate).toISOString() : undefined,
          conditions: rawPromo.conditions || [],
          isActive: rawPromo.isActive !== false,
        };

        const existingPromo = await Promotion.findOne({ name: promoData.name });

        if (existingPromo) {
          if (settings.conflictResolution === 'skip') {
            skippedCount++;
            continue;
          } else if (settings.conflictResolution === 'overwrite') {
            await Promotion.updateOne({ _id: existingPromo._id }, { $set: promoData }, { runValidators: true });
            updatedCount++;
          }
        } else {
          await Promotion.create(promoData);
          createdCount++;
        }
      } catch (e: any) {
        errorCount++;
        errors.push({ promotionName: rawPromo.name, error: e.message || 'Unknown error during import of this promotion.' });
      }
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.promotionImportSummary', 
      messageParams: { created: createdCount, updated: updatedCount, skipped: skippedCount, errors: errorCount },
      type: errorCount > 0 ? 'warning' : 'success',
      link: '/promotions',
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
      messageKey: 'Notifications.promotionImportFailed',
      messageParams: { error: errorMessage },
      type: 'error',
      ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
