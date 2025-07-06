
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

interface Params {
  id: string;
}

// This GET handler can be used if you need to fetch a single notification by ID directly.
export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid notification ID format' }, { status: 400 });
  }

  await dbConnect();

  try {
    const notification = await Notification.findById(id);
    if (!notification) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: notification });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching notification';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}


export async function DELETE(request: Request, { params }: { params: Params }) {
  const { id } = params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid notification ID format' }, { status: 400 });
  }

  await dbConnect();

  try {
    const deletedNotification = await Notification.findByIdAndDelete(id);
    if (!deletedNotification) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { message: 'Notification deleted successfully' } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error deleting notification';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
