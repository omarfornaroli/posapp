
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Currency from '@/models/Currency';
import User from '@/models/User';
import type { Currency as CurrencyType } from '@/types';
import NotificationService from '@/services/notification.service';

interface ImportRequestBody {
  currencies: Partial<CurrencyType>[];
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
    const { currencies: currenciesToImport, settings } = body;

    if (!currenciesToImport || !Array.isArray(currenciesToImport)) {
      return NextResponse.json({ success: false, error: 'Invalid currency data provided.' }, { status: 400 });
    }
    if (!settings || !settings.conflictResolution) {
      return NextResponse.json({ success: false, error: 'Invalid import settings.' }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: { currencyCode?: string; currencyName?: string; error: string }[] = [];
    
    for (const rawCurrency of currenciesToImport) {
      try {
        if (!rawCurrency.name || !rawCurrency.code || !rawCurrency.symbol || rawCurrency.decimalPlaces === undefined) {
          errors.push({ currencyName: rawCurrency.name, currencyCode: rawCurrency.code, error: 'Missing required fields: name, code, symbol, decimalPlaces.' });
          errorCount++;
          continue;
        }

        const currencyData = {
          name: rawCurrency.name.trim(),
          code: rawCurrency.code.toUpperCase().trim(),
          symbol: rawCurrency.symbol.trim(),
          decimalPlaces: Number(rawCurrency.decimalPlaces),
          isEnabled: rawCurrency.isEnabled !== false,
          isDefault: !!rawCurrency.isDefault,
          exchangeRate: rawCurrency.exchangeRate ? Number(rawCurrency.exchangeRate) : undefined,
        };

        const existingCurrency = await Currency.findOne({ code: currencyData.code });

        if (existingCurrency) {
          if (settings.conflictResolution === 'skip') {
            skippedCount++;
            continue;
          } else if (settings.conflictResolution === 'overwrite') {
            await Currency.updateOne({ _id: existingCurrency._id }, { $set: currencyData }, { runValidators: true });
            updatedCount++;
          }
        } else {
          await Currency.create(currencyData);
          createdCount++;
        }
      } catch (e: any) {
        errorCount++;
        errors.push({ currencyCode: rawCurrency.code, currencyName: rawCurrency.name, error: e.message || 'Unknown error during import of this currency.' });
      }
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.currencyImportSummary', 
      messageParams: { created: createdCount, updated: updatedCount, skipped: skippedCount, errors: errorCount },
      type: errorCount > 0 ? 'warning' : 'success',
      link: '/currencies',
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
      messageKey: 'Notifications.currencyImportFailed',
      messageParams: { error: errorMessage },
      type: 'error',
      ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
