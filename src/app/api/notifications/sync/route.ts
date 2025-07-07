// src/api/notifications/sync/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Notification from '@/models/Notification';
import type { SyncQueueItem } from '@/lib/dexie-db';

export async function POST(request: Request) {
  await dbConnect();

  try {
    const operations: Omit<SyncQueueItem, 'id' | 'timestamp'>[] = await request.json();
    const results = [];
    
    for (const op of operations) {
      try {
        switch(op.operation) {
          case 'create':
            // Notifications are created server-side, so a client 'create' is not expected.
            results.push({ status: 'rejected', operation: op.operation, reason: 'Create operation not supported for notifications sync.' });
            break;
          case 'update':
            // This is primarily for marking as read/unread
            const { id: updateId, ...updateData } = op.data;
            const updatedNotification = await Notification.findByIdAndUpdate(updateId, updateData, { new: true });
            if (!updatedNotification) throw new Error(`Notification with id ${updateId} not found for update.`);
            results.push({ status: 'fulfilled', operation: 'update', data: updatedNotification });
            break;
          case 'delete':
            const deletedNotification = await Notification.findByIdAndDelete(op.data.id);
            if (!deletedNotification) {
              // It's possible it was already deleted, so we don't throw an error, just log.
              console.warn(`Notification with id ${op.data.id} not found for deletion, might have been already deleted.`);
            }
            results.push({ status: 'fulfilled', operation: 'delete', data: { id: op.data.id } });
            break;
        }
      } catch (e: any) {
        results.push({ status: 'rejected', operation: op.operation, reason: e.message, data: op.data });
      }
    }
    
    const hasFailures = results.some(r => r.status === 'rejected');
    if (hasFailures) {
       console.error("Some notification sync operations failed:", results.filter(r => r.status === 'rejected'));
    }

    return NextResponse.json({ success: true, results });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during sync process.';
    console.error('[API/notifications/sync] Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
