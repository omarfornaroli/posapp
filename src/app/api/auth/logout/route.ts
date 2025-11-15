// src/app/api/auth/logout/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { getApiPath } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    // In a real app with session cookies, you would clear the cookie here.
    // For this app, the client-side will clear localStorage.
    // We provide a server-side redirect as a fallback.
    const loginUrl = new URL(getApiPath('/login'), request.url);
    
    return NextResponse.redirect(loginUrl.toString(), { status: 307 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error during logout.';
    console.error('[API/auth/logout] Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
