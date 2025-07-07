// This API route has been moved to /src/app/api/languages/sync/route.ts and is no longer used.
// This file can be safely deleted.
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ success: false, error: 'This endpoint is deprecated.' }, { status: 410 });
}
