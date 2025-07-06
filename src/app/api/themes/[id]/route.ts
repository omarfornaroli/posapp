
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Theme from '@/models/Theme';
import type { Theme as ThemeType } from '@/types';
import mongoose from 'mongoose';

interface Params {
  id: string;
}

export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid theme ID format' }, { status: 400 });
  }

  await dbConnect();
  try {
    const theme = await Theme.findById(id);
    if (!theme) {
      return NextResponse.json({ success: false, error: 'Theme not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: theme });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const { id } = params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid theme ID format' }, { status: 400 });
  }

  await dbConnect();

  try {
    const body = await request.json() as Partial<Omit<ThemeType, 'id' | 'isDefault'>>; 
    const { name, ...updateData } = body; // Name is not updated via this route to preserve uniqueness from POST

    const theme = await Theme.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!theme) {
      return NextResponse.json({ success: false, error: 'Theme not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: theme });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
