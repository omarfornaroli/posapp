
import { NextResponse, type NextRequest } from 'next/server';
import { translateText } from '@/ai/flows/translate-flow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, targetLangs, sourceLang } = body;

    if (!text || !Array.isArray(targetLangs) || targetLangs.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing required parameters: text, targetLangs' }, { status: 400 });
    }

    const translations: Record<string, string> = {};
    for (const lang of targetLangs) {
      translations[lang] = await translateText(text, lang, sourceLang || 'en');
    }

    return NextResponse.json({ success: true, translations });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error during translation.';
    console.error('[API/translations/translate] Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
