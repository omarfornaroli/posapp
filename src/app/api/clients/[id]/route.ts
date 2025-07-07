
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Client from '@/models/Client';
import User from '@/models/User';
import type { Client as ClientType } from '@/types';
import NotificationService from '@/services/notification.service';
import mongoose from 'mongoose';

async function getActorDetails(request: Request) {
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

export async function GET(request: Request, context: { params: { id: string } }) {
  const { id } = context.params;
  await dbConnect();

  try {
    const client = await Client.findById(id);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: client });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}

export async function PUT(request: Request, context: { params: { id: string } }) {
  const { id } = context.params;
  await dbConnect();

  try {
    const { actorId, ...notificationDetails } = await getActorDetails(request);
    if (!actorId) {
        return NextResponse.json({ success: false, error: 'Unauthorized: No valid user found for this action.' }, { status: 401 });
    }

    const body = await request.json() as Partial<Omit<ClientType, 'id'>>;
    const updateData = { ...body, updatedBy: actorId };

    const client = await Client.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }
    
    await NotificationService.createNotification({
      messageKey: 'Notifications.clientUpdated',
      messageParams: { clientName: client.name },
      type: 'success',
      link: `/clients?highlight=${client.id}`,
      ...notificationDetails,
      actorId: actorId.toString(),
    });

    return NextResponse.json({ success: true, data: client });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const { actorId, ...notificationDetails } = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.clientUpdateFailed',
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

export async function DELETE(request: Request, context: { params: { id: string } }) {
  const { id } = context.params;
  await dbConnect();

  try {
    const { actorId, ...notificationDetails } = await getActorDetails(request);
    if (!actorId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: No valid user found for this action.' }, { status: 401 });
    }
    
    const deletedClient = await Client.findByIdAndDelete(id);
    if (!deletedClient) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }
    
    await NotificationService.createNotification({
      messageKey: 'Notifications.clientDeleted',
      messageParams: { clientName: deletedClient.name },
      type: 'info',
      ...notificationDetails,
      actorId: actorId.toString(),
    });

    return NextResponse.json({ success: true, data: { message: "Client deleted successfully" } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const { actorId, ...notificationDetails } = await getActorDetails(request);
    await NotificationService.createNotification({
        messageKey: 'Notifications.clientDeleteFailed',
        messageParams: { error: errorMessage },
        type: 'error',
        ...notificationDetails,
        actorId: actorId?.toString(),
      });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
