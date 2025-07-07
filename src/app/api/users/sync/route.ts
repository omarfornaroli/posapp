
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import type { SyncQueueItem } from '@/lib/dexie-db';

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const operations: Omit<SyncQueueItem, 'id' | 'timestamp'>[] = await request.json();
    const results = [];
    
    for (const op of operations) {
      try {
        switch(op.operation) {
          case 'create':
            // The create action for users is special, it requires token generation etc.
            // The sync for create will be a no-op, as the initial creation must be online.
            // We can retrieve the server-generated user to update the local temp ID if needed.
            const existingUser = await User.findOne({ email: op.data.email });
            if (existingUser) {
              results.push({ status: 'fulfilled', operation: 'create', data: existingUser });
            } else {
              throw new Error(`User with email ${op.data.email} not found for sync-create.`);
            }
            break;
          case 'update':
            const { id: updateId, ...updateData } = op.data;
            const updatedUser = await User.findByIdAndUpdate(updateId, updateData, { new: true });
            if (!updatedUser) throw new Error(`User with id ${updateId} not found for update.`);
            results.push({ status: 'fulfilled', operation: 'update', data: updatedUser });
            break;
          case 'delete':
            const deletedUser = await User.findByIdAndDelete(op.data.id);
            if (!deletedUser) throw new Error(`User with id ${op.data.id} not found for deletion.`);
            results.push({ status: 'fulfilled', operation: 'delete', data: { id: op.data.id } });
            break;
        }
      } catch (e: any) {
        results.push({ status: 'rejected', operation: op.operation, reason: e.message, data: op.data });
      }
    }
    
    const hasFailures = results.some(r => r.status === 'rejected');
    if (hasFailures) {
       console.error("Some user sync operations failed:", results.filter(r => r.status === 'rejected'));
    }

    return NextResponse.json({ success: true, results });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during sync process.';
    console.error('[API/users/sync] Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
