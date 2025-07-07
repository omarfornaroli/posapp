
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Theme from '@/models/Theme';
import mongoose from 'mongoose';

export async function PUT(request: Request, context: { params: { id: string } }) {
  const { id } = context.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid theme ID format' }, { status: 400 });
  }

  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await Theme.updateMany({ _id: { $ne: id } }, { isDefault: false }, { session });
    const updatedTheme = await Theme.findByIdAndUpdate(id, { isDefault: true }, { new: true, session });

    if (!updatedTheme) {
      await session.abortTransaction();
      return NextResponse.json({ success: false, error: 'Theme not found' }, { status: 404 });
    }

    await session.commitTransaction();

    return NextResponse.json({ success: true, data: updatedTheme });
  } catch (error) {
    await session.abortTransaction();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  } finally {
    session.endSession();
  }
}
