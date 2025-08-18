
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Translation from '@/models/Translation';
import type { TranslationRecord, TranslationDocument } from '@/models/Translation';
import { translateText } from '@/ai/flows/translate-flow';
import AppLanguage from '@/models/AppLanguage';

interface UpdateTranslationRequestBody {
  keyPath: string;
  valuesToUpdate: Record<string, string>; // e.g., { "en": "New English", "fr": "Nouveau Français" }
}

export async function PUT(request: Request) {
  await dbConnect();

  try {
    const isTranslateKeySet = !!process.env.GEMINI_API_KEY;
    const body = await request.json() as UpdateTranslationRequestBody;
    const { keyPath, valuesToUpdate } = body;

    if (!keyPath || typeof valuesToUpdate !== 'object' || valuesToUpdate === null) {
      return NextResponse.json({ success: false, error: 'Missing required fields: keyPath, valuesToUpdate' }, { status: 400 });
    }

    const translation = await Translation.findOne({ keyPath });

    if (!translation) {
      return NextResponse.json({ success: false, error: `Translation with keyPath "${keyPath}" not found` }, { status: 404 });
    }

    if (!translation.values) {
      translation.values = new Map<string, string>(); // Initialize if somehow missing
    }

    // Update or add new language values
    Object.entries(valuesToUpdate).forEach(([lang, value]) => {
      translation.values.set(lang, value);
    });

    // Auto-translation logic
    if (isTranslateKeySet) {
        const sourceLang = 'en';
        const sourceText = translation.values.get(sourceLang);
        if (sourceText) {
            const enabledLanguages = await AppLanguage.find({ isEnabled: true }).lean();
            const targetLangs = enabledLanguages
                .map(l => l.code)
                .filter(code => code !== sourceLang && !translation.values.get(code));

            if (targetLangs.length > 0) {
                const translations = await Promise.all(
                    targetLangs.map(lang => translateText(sourceText, lang, sourceLang))
                );
                targetLangs.forEach((lang, index) => {
                    translation.values.set(lang, translations[index]);
                });
            }
        }
    }

    await translation.save();

    // Convert Mongoose Map to plain object for the response
    const responseData = {
        ...translation.toObject({ virtuals: true }),
        values: Object.fromEntries(translation.values)
    };

    return NextResponse.json({ success: true, data: responseData });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error updating translation';
    console.error("Error in PUT /api/translations/item:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
