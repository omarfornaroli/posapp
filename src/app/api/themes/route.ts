
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Theme from '@/models/Theme';
import type { Theme as ThemeType } from '@/types';

export async function GET() {
  await dbConnect();
  try {
    const themes = await Theme.find({}).sort({ name: 1 });
    return NextResponse.json({ success: true, data: themes });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json() as Omit<ThemeType, 'id' | 'isDefault'>;
    
    const themeToCreate: Omit<ThemeType, 'id'> = {
      ...body,
      isDefault: false, 
    };

    const newTheme = await Theme.create(themeToCreate);

    return NextResponse.json({ success: true, data: newTheme }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof Error && 'code' in error && (error as any).code === 11000 && (error as any).keyPattern?.name) {
      return NextResponse.json({ success: false, error: 'A theme with this name already exists.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
