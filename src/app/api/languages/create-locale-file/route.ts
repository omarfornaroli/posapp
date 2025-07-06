
// This API endpoint is being removed as per the user's request to eliminate
// the manual "Add Locale File" functionality from the Languages Manager page.
// Language message files (e.g., src/messages/fr.json) should now be added manually
// by the developer if a new language is configured.
// The Translations Manager page will allow populating these files once the language
// is active in i18n-config.ts and the server is restarted.

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.warn("[API/languages/create-locale-file POST] This endpoint is deprecated and should not be used. Locale files should be created manually in src/messages/.");
  return NextResponse.json({ 
    success: false, 
    error: "This endpoint is deprecated. Locale files (e.g., src/messages/fr.json) should be created manually." 
  }, { status: 410 }); // 410 Gone
}
