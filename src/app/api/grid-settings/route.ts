
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import GridSetting from '@/models/GridSetting';
import type { GridSetting as GridSettingType } from '@/types';

// GET grid settings for a pagePath
export async function GET(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const pagePath = searchParams.get('pagePath');

  if (!pagePath) {
    return NextResponse.json({ success: false, error: 'pagePath query parameter is required' }, { status: 400 });
  }

  try {
    const settings = await GridSetting.findOne({ pagePath });
    if (!settings) {
      return NextResponse.json({ success: false, error: 'No settings found for this page. Defaults will be used.' }, { status: 200 });
    }
    // Ensure groupingKeys is an array even if DB returns null/undefined for some reason
    const data = settings.toObject({ virtuals: true });
    data.groupingKeys = data.groupingKeys || [];
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching grid settings';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// POST (Save/Update) grid settings for a pagePath
export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json() as Omit<GridSettingType, 'id'>;
    
    if (!body.pagePath) {
      return NextResponse.json({ success: false, error: 'pagePath is required in the request body' }, { status: 400 });
    }

    // Ensure groupingKeys is an array, default to empty array if not provided
    const settingsToSave = {
      ...body,
      groupingKeys: Array.isArray(body.groupingKeys) ? body.groupingKeys : [],
    };

    const updatedSettings = await GridSetting.findOneAndUpdate(
      { pagePath: settingsToSave.pagePath },
      { $set: settingsToSave },
      { new: true, upsert: true, runValidators: true }
    );
    
    const data = updatedSettings.toObject({ virtuals: true });
    data.groupingKeys = data.groupingKeys || []; // Ensure it's an array in response
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error saving grid settings';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
