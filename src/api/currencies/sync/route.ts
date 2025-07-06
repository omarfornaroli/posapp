// src/api/currencies/sync/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Currency from '@/models/Currency';
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
            const newCurrency = await Currency.create(createData);
            results.push({ status: 'fulfilled', operation: 'create', data: newCurrency });
            break;
          case 'update':
            const { id: updateId, ...updateData } = op.data;
            const updatedCurrency = await Currency.findByIdAndUpdate(updateId, updateData, { new: true });
            if (!updatedCurrency) throw new Error(`Currency with id ${updateId} not found for update.`);
            results.push({ status: 'fulfilled', operation: 'update', data: updatedCurrency });
            break;
          case 'delete':
            const deletedCurrency = await Currency.findByIdAndDelete(op.data.id);
            if (!deletedCurrency) throw new Error(`Currency with id ${op.data.id} not found for deletion.`);
            results.push({ status: 'fulfilled', operation: 'delete', data: { id: op.data.id } });
            break;
        }
      } catch (e: any) {
        results.push({ status: 'rejected', operation: op.operation, reason: e.message, data: op.data });
      }
    }
    
    const hasFailures = results.some(r => r.status === 'rejected');
    if (hasFailures) {
       console.error("Some currency sync operations failed:", results.filter(r => r.status === 'rejected'));
    }

    return NextResponse.json({ success: true, results });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during sync process.';
    console.error('[API/currencies/sync] Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
