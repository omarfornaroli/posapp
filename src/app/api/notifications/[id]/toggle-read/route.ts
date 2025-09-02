
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ success: false, error: 'Notification ID is required.' }, { status: 400 });
  }
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid notification ID format' }, { status: 400 });
  }

  await dbConnect();

  try {
    const notification = await Notification.findById(id);
    if (!notification) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 });
    }

    notification.isRead = !notification.isRead; // Toggle the read status
    await notification.save();
    
    return NextResponse.json({ success: true, data: notification });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error toggling notification read status';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
