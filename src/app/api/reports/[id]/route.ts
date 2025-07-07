
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Report from '@/models/Report';
import User from '@/models/User';
import mongoose from 'mongoose';

async function getActorDetails(request: Request) {
  const userEmail = request.headers.get('X-User-Email');
  if (userEmail) {
    const actingUser = await User.findOne({ email: userEmail }).lean();
    if (actingUser) {
      return { actorId: actingUser._id as mongoose.Types.ObjectId };
    }
  }
  return { actorId: null };
}

export async function GET(request: Request, context: { params: { id: string } }) {
  await dbConnect();
  try {
    if (!mongoose.Types.ObjectId.isValid(context.params.id)) {
      return NextResponse.json({ success: false, error: 'Invalid report ID' }, { status: 400 });
    }
    const report = await Report.findById(context.params.id);
    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: { id: string } }) {
  await dbConnect();
  try {
    if (!mongoose.Types.ObjectId.isValid(context.params.id)) {
      return NextResponse.json({ success: false, error: 'Invalid report ID' }, { status: 400 });
    }
    const { actorId } = await getActorDetails(request);
    const body = await request.json();
    const { name, description } = body;

    const report = await Report.findByIdAndUpdate(
      context.params.id,
      { name, description, updatedBy: actorId },
      { new: true, runValidators: true }
    );
    
    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error updating report';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  await dbConnect();
  try {
    if (!mongoose.Types.ObjectId.isValid(context.params.id)) {
      return NextResponse.json({ success: false, error: 'Invalid report ID' }, { status: 400 });
    }
    const deletedReport = await Report.findByIdAndDelete(context.params.id);
    if (!deletedReport) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { message: 'Report deleted successfully' } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error deleting report';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
