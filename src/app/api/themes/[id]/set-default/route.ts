
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Theme from '@/models/Theme';
import mongoose from 'mongoose';

export async function PUT(request: Request, { params }: any) {
  const { id } = params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid theme ID format' }, { status: 400 });
  }

  await dbConnect();
  
  try {
    // Run as sequential operations instead of a transaction
    await Theme.updateMany({ _id: { $ne: id } }, { isDefault: false });
    const updatedTheme = await Theme.findByIdAndUpdate(id, { isDefault: true }, { new: true });

    if (!updatedTheme) {
      return NextResponse.json({ success: false, error: 'Theme not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedTheme });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
