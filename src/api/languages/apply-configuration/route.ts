

// This API route is no longer necessary as the UI now dynamically loads languages
// from the database via Dexie, and does not depend on a static config file for the UI.
// The middleware will fall back to 'en' or 'es' if a new language route is accessed before restart,
// but the UI itself will function correctly with the new language selected.
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.warn("[API/languages/apply-configuration POST] This endpoint is deprecated. Language changes are now handled dynamically by the client.");
  return NextResponse.json({ 
    success: false, 
    error: "This endpoint is deprecated. Server restarts are no longer required to see UI language changes." 
  }, { status: 410 }); // 410 Gone
}
