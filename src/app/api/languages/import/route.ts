
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AppLanguage from '@/models/AppLanguage';
import User from '@/models/User';
import type { AppLanguage as AppLanguageType } from '@/types';
import NotificationService from '@/services/notification.service';

interface ImportRequestBody {
  languages: Partial<AppLanguageType>[];
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
    const { languages: languagesToImport, settings } = body;

    if (!languagesToImport || !Array.isArray(languagesToImport)) {
      return NextResponse.json({ success: false, error: 'Invalid language data provided.' }, { status: 400 });
    }
    if (!settings || !settings.conflictResolution) {
      return NextResponse.json({ success: false, error: 'Invalid import settings.' }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: { langCode?: string; langName?: string; error: string }[] = [];
    
    for (const rawLang of languagesToImport) {
      try {
        if (!rawLang.name || !rawLang.code) {
          errors.push({ langName: rawLang.name, langCode: rawLang.code, error: 'Missing name or code.' });
          errorCount++;
          continue;
        }

        const langData = {
          name: rawLang.name.trim(),
          code: rawLang.code.toLowerCase().trim(),
          isEnabled: rawLang.isEnabled !== false,
          isDefault: !!rawLang.isDefault,
        };

        const existingLang = await AppLanguage.findOne({ code: langData.code });

        if (existingLang) {
          if (settings.conflictResolution === 'skip') {
            skippedCount++;
            continue;
          } else if (settings.conflictResolution === 'overwrite') {
            await AppLanguage.updateOne({ _id: existingLang._id }, { $set: langData }, { runValidators: true });
            updatedCount++;
          }
        } else {
          await AppLanguage.create(langData);
          createdCount++;
        }
      } catch (e: any) {
        errorCount++;
        errors.push({ langCode: rawLang.code, langName: rawLang.name, error: e.message || 'Unknown error during import of this language.' });
      }
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.languageImportSummary', 
      messageParams: { created: createdCount, updated: updatedCount, skipped: skippedCount, errors: errorCount },
      type: errorCount > 0 ? 'warning' : 'success',
      link: '/languages',
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
      messageKey: 'Notifications.languageImportFailed',
      messageParams: { error: errorMessage },
      type: 'error',
      ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
