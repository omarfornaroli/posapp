
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Report from '@/models/Report';
import User from '@/models/User';
import mongoose from 'mongoose';
import type { Report as ReportType } from '@/types';

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

export async function GET() {
  await dbConnect();
  try {
    const reports = await Report.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: reports });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const { actorId } = await getActorDetails(request);
    const body: Omit<ReportType, 'id' | 'createdAt' | 'updatedAt'> = await request.json();

    if (!body.name || !body.query || !body.reportData) {
        return NextResponse.json({ success: false, error: 'Missing required fields: name, query, reportData' }, { status: 400 });
    }
    
    const newReport = await Report.create({ 
        ...body, 
        createdBy: actorId, 
        updatedBy: actorId 
    });

    return NextResponse.json({ success: true, data: newReport }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error creating report';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

    