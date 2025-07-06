
// This file is no longer needed as the Languages Manager page
// will primarily rely on database settings, and src/i18n-config.ts
// will be auto-generated from those settings.
// Keeping it empty or deleting it. For safety, I'll make it return an error
// to indicate it should not be used.

import { NextResponse } from 'next/server';

export async function GET() {
  console.warn("[API/languages/config] This endpoint is deprecated and should no longer be used. Language configuration is managed via /api/language-settings and auto-generates src/i18n-config.ts.");
  return NextResponse.json({ 
    success: false, 
    error: "This endpoint is deprecated. Please use /api/language-settings." 
  }, { status: 410 }); // 410 Gone
}
