

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Translation from '@/models/Translation';
import type { TranslationRecord, TranslationDocument } from '@/models/Translation';
import { translateText } from '@/ai/flows/translate-flow';
import AppLanguage from '@/models/AppLanguage';

export async function PUT(request: Request) {
  await dbConnect();

  try {
    const isTranslateKeySet = !!process.env.GEMINI_API_KEY;
    const body = await request.json() as TranslationRecord;
    const { keyPath, values } = body;

    if (!keyPath || typeof values !== 'object' || values === null) {
      return NextResponse.json({ success: false, error: 'Missing required fields: keyPath, values' }, { status: 400 });
    }

    const translation = await Translation.findOne({ keyPath });

    if (!translation) {
      return NextResponse.json({ success: false, error: `Translation with keyPath "${keyPath}" not found` }, { status: 404 });
    }

    if (!translation.values) {
      translation.values = new Map<string, string>();
    }
    
    // The sync now sends the whole values object.
    Object.entries(values).forEach(([lang, value]) => {
      translation.values.set(lang, value);
    });

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

