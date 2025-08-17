
import { NextResponse } from 'next/server';

export async function GET() {
  const isKeySet = !!process.env.GOOGLE_TRANSLATE_API_KEY;
  return NextResponse.json({ success: true, data: { isKeySet } });
}
