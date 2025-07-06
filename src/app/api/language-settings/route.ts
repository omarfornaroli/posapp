
// This API route is deprecated and has been replaced by:
// - GET /api/languages (to fetch all language configurations)
// - POST /api/languages (to add a new language)
// - PUT /api/languages/[id] (to update a specific language)
// - DELETE /api/languages/[id] (to delete a language)
// - POST /api/languages/apply-configuration (to update i18n-config.ts)

import { NextResponse } from 'next/server';

export async function GET() {
  console.warn("[API/language-settings GET] This endpoint is deprecated. Use /api/languages instead.");
  return NextResponse.json({ 
    success: false, 
    error: "This endpoint is deprecated. Please use GET /api/languages to fetch language configurations." 
  }, { status: 410 }); // 410 Gone
}

export async function POST(request: Request) {
  console.warn("[API/language-settings POST] This endpoint is deprecated. Use /api/languages/apply-configuration to update i18n-config.ts based on DB settings.");
  return NextResponse.json({ 
    success: false, 
    error: "This endpoint is deprecated. Use POST /api/languages/apply-configuration to update i18n-config.ts." 
  }, { status: 410 }); // 410 Gone
}
