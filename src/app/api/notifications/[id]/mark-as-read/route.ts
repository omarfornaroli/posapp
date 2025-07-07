
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid notification ID format' }, { status: 400 });
  }

  await dbConnect();

  try {
    const notification = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    if (!notification) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: notification });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error marking notification as read';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
