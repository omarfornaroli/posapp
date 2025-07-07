
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Client from '@/models/Client';
import User from '@/models/User';
import type { Client as ClientType } from '@/types';
import NotificationService from '@/services/notification.service';
import mongoose from 'mongoose';

async function getActorDetails(request: NextRequest) {
  const userEmail = request.headers.get('X-User-Email');
  if (userEmail) {
    const actingUser = await User.findOne({ email: userEmail }).lean();
    if (actingUser) {
      return {
        actorId: actingUser._id as mongoose.Types.ObjectId,
        actorName: actingUser.name,
        actorImageUrl: actingUser.imageUrl,
      };
    }
  }
  return { actorId: null, actorName: 'System', actorImageUrl: undefined };
}

export async function GET() {
  await dbConnect();
  try {
    const clients = await Client.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: clients });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const { actorId, ...notificationDetails } = await getActorDetails(request);
    if (!actorId) {
        return NextResponse.json({ success: false, error: 'Unauthorized: No valid user found for this action.' }, { status: 401 });
    }

    const body = await request.json() as Omit<ClientType, 'id' | 'registrationDate'> & { registrationDate?: string };
    
    const clientData: Partial<ClientType> = { ...body };
    if (!body.registrationDate) {
      clientData.registrationDate = new Date().toISOString();
    }
    
    const newClient = await Client.create({
        ...clientData,
        createdBy: actorId,
        updatedBy: actorId,
    });
    
    await NotificationService.createNotification({
      messageKey: 'Notifications.clientCreated',
      messageParams: { clientName: newClient.name },
      type: 'success',
      link: `/clients?highlight=${newClient.id}`,
      ...notificationDetails,
      actorId: actorId.toString(),
    });

    return NextResponse.json({ success: true, data: newClient }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const { actorId, ...notificationDetails } = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.clientCreateFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...notificationDetails,
        actorId: actorId?.toString(),
    });
    if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
      return NextResponse.json({ success: false, error: 'Email already exists for another client.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
