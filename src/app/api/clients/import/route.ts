
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Client from '@/models/Client';
import User from '@/models/User';
import type { Client as ClientType } from '@/types';
import NotificationService from '@/services/notification.service';

interface ImportRequestBody {
  clients: Partial<ClientType>[];
  settings: {
    conflictResolution: 'skip' | 'overwrite';
  };
}

async function getActorDetails(request: NextRequest) {
  const userEmail = request.headers.get('X-User-Email');
  if (userEmail) {
    const actingUser = await User.findOne({ email: userEmail }).lean();
    if (actingUser) {
      return {
        actorId: actingUser._id.toString(),
        actorName: actingUser.name,
        actorImageUrl: actingUser.imageUrl,
      };
    }
  }
  return {};
}

export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const body = await request.json() as ImportRequestBody;
    const { clients: clientsToImport, settings } = body;

    if (!clientsToImport || !Array.isArray(clientsToImport)) {
      return NextResponse.json({ success: false, error: 'Invalid client data provided.' }, { status: 400 });
    }
    if (!settings || !settings.conflictResolution) {
      return NextResponse.json({ success: false, error: 'Invalid import settings.' }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: { clientEmail?: string; clientName?: string; error: string }[] = [];
    
    for (const rawClient of clientsToImport) {
      try {
        if (!rawClient.email || !rawClient.name) {
          errors.push({ clientName: rawClient.name, clientEmail: rawClient.email, error: 'Missing name or email.' });
          errorCount++;
          continue;
        }

        const clientData = {
          name: rawClient.name.trim(),
          email: rawClient.email.toLowerCase().trim(),
          phone: rawClient.phone?.trim() || undefined,
          address: rawClient.address?.trim() || undefined,
          registrationDate: rawClient.registrationDate || new Date().toISOString(),
        };

        const existingClient = await Client.findOne({ email: clientData.email });

        if (existingClient) {
          if (settings.conflictResolution === 'skip') {
            skippedCount++;
            continue;
          } else if (settings.conflictResolution === 'overwrite') {
            const { id, _id, __v, createdAt, updatedAt, ...updateData } = clientData as any;
            await Client.updateOne({ _id: existingClient._id }, { $set: updateData }, { runValidators: true });
            updatedCount++;
          }
        } else {
          await Client.create(clientData);
          createdCount++;
        }
      } catch (e: any) {
        errorCount++;
        errors.push({ clientEmail: rawClient.email, clientName: rawClient.name, error: e.message || 'Unknown error during import of this client.' });
      }
    }
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.clientImportSummary',
      messageParams: { created: createdCount, updated: updatedCount, skipped: skippedCount, errors: errorCount },
      type: errorCount > 0 ? 'warning' : 'success',
      link: '/clients',
      ...actorDetails
    });

    return NextResponse.json({
      success: true,
      data: { createdCount, updatedCount, skippedCount, errorCount, errors: errorCount > 0 ? errors : undefined, }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during import process.';
    const actorDetails = await getActorDetails(request);
    await NotificationService.createNotification({
      messageKey: 'Notifications.clientImportFailed',
      messageParams: { error: errorMessage },
      type: 'error',
      ...actorDetails
    });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
