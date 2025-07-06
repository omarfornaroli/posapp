import { NextResponse } from 'next/server';

export async function GET() {
  const isKeySet = !!process.env.GEMINI_API_KEY;
  return NextResponse.json({ success: true, data: { isKeySet } });
}
