
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Translation from '@/models/Translation';
import AppLanguage from '@/models/AppLanguage'; // Import the correct model

export async function GET() {
  await dbConnect();
  try {
    // Fetch active locales from AppLanguage model
    const enabledLanguages = await AppLanguage.find({ isEnabled: true }).lean();
    let activeLocales: string[];
    if (enabledLanguages.length > 0) {
      activeLocales = enabledLanguages.map(lang => lang.code);
    } else {
      // Fallback if no enabled languages are configured in the DB
      console.warn('[API/translations/all-details] No enabled languages found in AppLanguage collection. Falling back to default locales [en, es].');
      activeLocales = ['en', 'es'];
    }

    const translationsFromDb = await Translation.find({}).lean();
    
    const translationsData = translationsFromDb.map(t => {
      let valuesObject = {};
      // After .lean(), t.values should be a plain JS object if it was a Map in schema.
      // If schema stores it as an object directly, this check is still fine.
      if (t.values && typeof t.values === 'object' && !(t.values instanceof Map)) {
        valuesObject = t.values;
      } else if (t.values instanceof Map) { // Should not happen with .lean() typically but good to be safe
        valuesObject = Object.fromEntries(t.values);
      }
      return {
        keyPath: t.keyPath,
        values: valuesObject,
      };
    });

    return NextResponse.json({ 
      success: true, 
      data: { 
        translations: translationsData, 
        activeLocales 
      } 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in /api/translations/all-details:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
