// src/api/taxes/sync/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tax from '@/models/Tax';
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
            const { id, ...createData } = op.data;
            const newTax = await Tax.create(createData);
            results.push({ status: 'fulfilled', operation: 'create', data: newTax });
            break;
          case 'update':
            const { id: updateId, ...updateData } = op.data;
            const updatedTax = await Tax.findByIdAndUpdate(updateId, updateData, { new: true });
            if (!updatedTax) throw new Error(`Tax with id ${updateId} not found for update.`);
            results.push({ status: 'fulfilled', operation: 'update', data: updatedTax });
            break;
          case 'delete':
            const deletedTax = await Tax.findByIdAndDelete(op.data.id);
            if (!deletedTax) throw new Error(`Tax with id ${op.data.id} not found for deletion.`);
            results.push({ status: 'fulfilled', operation: 'delete', data: { id: op.data.id } });
            break;
        }
      } catch (e: any) {
        results.push({ status: 'rejected', operation: op.operation, reason: e.message, data: op.data });
      }
    }
    
    const hasFailures = results.some(r => r.status === 'rejected');
    if (hasFailures) {
       console.error("Some tax sync operations failed:", results.filter(r => r.status === 'rejected'));
    }

    return NextResponse.json({ success: true, results });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during sync process.';
    console.error('[API/taxes/sync] Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
