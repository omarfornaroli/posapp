// src/api/suppliers/sync/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Supplier from '@/models/Supplier';
import type { SyncQueueItem } from '@/lib/dexie-db';

export async function POST(request: Request) {
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
            const newSupplier = await Supplier.create(createData);
            results.push({ status: 'fulfilled', operation: 'create', data: newSupplier });
            break;
          case 'update':
            const { id: updateId, ...updateData } = op.data;
            const updatedSupplier = await Supplier.findByIdAndUpdate(updateId, updateData, { new: true });
            if (!updatedSupplier) throw new Error(`Supplier with id ${updateId} not found for update.`);
            results.push({ status: 'fulfilled', operation: 'update', data: updatedSupplier });
            break;
          case 'delete':
            const deletedSupplier = await Supplier.findByIdAndDelete(op.data.id);
            if (!deletedSupplier) throw new Error(`Supplier with id ${op.data.id} not found for deletion.`);
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
    console.error('[API/suppliers/sync] Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
