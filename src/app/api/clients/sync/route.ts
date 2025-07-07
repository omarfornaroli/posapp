
import { NextResponse, type NextRequest } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Client from '@/models/Client';
import type { SyncQueueItem } from '@/lib/dexie-db';

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const operations: Omit<SyncQueueItem, 'id' | 'timestamp'>[] = await request.json();
    const results = [];
    
    // This should ideally be a single transaction, but for simplicity, we process one by one
    for (const op of operations) {
      try {
        switch(op.operation) {
          case 'create':
            // The data might have a temp client-generated ID, we ignore it and let Mongo create one.
            const { id, ...createData } = op.data;
            const newClient = await Client.create(createData);
            results.push({ status: 'fulfilled', operation: 'create', data: newClient });
            break;
          case 'update':
            const { id: updateId, ...updateData } = op.data;
            const updatedClient = await Client.findByIdAndUpdate(updateId, updateData, { new: true });
            if (!updatedClient) throw new Error(`Client with id ${updateId} not found for update.`);
            results.push({ status: 'fulfilled', operation: 'update', data: updatedClient });
            break;
          case 'delete':
            const deletedClient = await Client.findByIdAndDelete(op.data.id);
            if (!deletedClient) throw new Error(`Client with id ${op.data.id} not found for deletion.`);
            results.push({ status: 'fulfilled', operation: 'delete', data: { id: op.data.id } });
            break;
        }
      } catch (e: any) {
        results.push({ status: 'rejected', operation: op.operation, reason: e.message, data: op.data });
      }
    }
    
    const hasFailures = results.some(r => r.status === 'rejected');
    if (hasFailures) {
       console.error("Some sync operations failed:", results.filter(r => r.status === 'rejected'));
    }

    return NextResponse.json({ success: true, results });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during sync process.';
    console.error('[API/clients/sync] Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
