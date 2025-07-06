
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Theme from '@/models/Theme';

export async function GET() {
  await dbConnect();
  try {
    let defaultTheme = await Theme.findOne({ isDefault: true });
    if (!defaultTheme) {
      // If no theme is marked as default, fall back to "Light" or the first theme.
      defaultTheme = await Theme.findOne({ name: 'Light' }) || await Theme.findOne().sort({ createdAt: 1 });
    }
    if (!defaultTheme) {
      return NextResponse.json({ success: false, error: 'No themes found in the database.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: defaultTheme });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
