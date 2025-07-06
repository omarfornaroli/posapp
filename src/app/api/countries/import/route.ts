
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Country from '@/models/Country';
import User from '@/models/User';
import type { Country as CountryType } from '@/types';
import NotificationService from '@/services/notification.service';

interface ImportRequestBody {
  countries: Partial<CountryType>[];
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
    const { countries: countriesToImport, settings } = body;

    if (!countriesToImport || !Array.isArray(countriesToImport)) {
      return NextResponse.json({ success: false, error: 'Invalid country data provided.' }, { status: 400 });
    }
    if (!settings || !settings.conflictResolution) {
      return NextResponse.json({ success: false, error: 'Invalid import settings.' }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: { countryCode?: string; countryName?: string; error: string }[] = [];
    
    for (const rawCountry of countriesToImport) {
      try {
        if (!rawCountry.name || !rawCountry.codeAlpha2) {
          errors.push({ countryName: rawCountry.name, countryCode: rawCountry.codeAlpha2, error: 'Missing name or Alpha-2 code.' });
          errorCount++;
          continue;
        }

        const countryData = {
          name: rawCountry.name.trim(),
          codeAlpha2: rawCountry.codeAlpha2.toUpperCase().trim(),
          codeAlpha3: rawCountry.codeAlpha3?.toUpperCase().trim(),
          numericCode: rawCountry.numericCode?.trim(),
          currencyCode: rawCountry.currencyCode?.toUpperCase().trim(),
          flagImageUrl: rawCountry.flagImageUrl?.trim(),
          isEnabled: rawCountry.isEnabled !== false,
          isDefault: !!rawCountry.isDefault,
        };

        const existingCountry = await Country.findOne({ codeAlpha2: countryData.codeAlpha2 });

        if (existingCountry) {
          if (settings.conflictResolution === 'skip') {
            skippedCount++;
            continue;
          } else if (settings.conflictResolution === 'overwrite') {
            await Country.updateOne({ _id: existingCountry._id }, { $set: countryData }, { runValidators: true });
            updatedCount++;
          }
        } else {
          await Country.create(countryData);
          createdCount++;
        }
      } catch (e: any) {
        errorCount++;
        errors.push({ countryCode: rawCountry.codeAlpha2, countryName: rawCountry.name, error: e.message || 'Unknown error during import of this country.' });
      }
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.countryImportSummary', 
      messageParams: { created: createdCount, updated: updatedCount, skipped: skippedCount, errors: errorCount },
      type: errorCount > 0 ? 'warning' : 'success',
      link: '/countries',
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
      messageKey: 'Notifications.countryImportFailed',
      messageParams: { error: errorMessage },
      type: 'error',
      ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
