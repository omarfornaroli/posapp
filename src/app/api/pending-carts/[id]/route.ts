
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import PendingCart from '@/models/PendingCart';
import mongoose from 'mongoose';

export async function DELETE(request: Request, { params }: any) {
  const { id } = params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 });
  }

  await dbConnect();

  try {
    const deletedCart = await PendingCart.findByIdAndDelete(id);
    if (!deletedCart) {
      return NextResponse.json({ success: false, error: 'Pending cart not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { message: 'Pending cart deleted successfully' } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error deleting pending cart';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
