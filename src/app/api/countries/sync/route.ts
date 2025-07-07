// src/api/countries/sync/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Country from '@/models/Country';
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
            const newCountry = await Country.create(createData);
            results.push({ status: 'fulfilled', operation: 'create', data: newCountry });
            break;
          case 'update':
            const { id: updateId, ...updateData } = op.data;
            const updatedCountry = await Country.findByIdAndUpdate(updateId, updateData, { new: true });
            if (!updatedCountry) throw new Error(`Country with id ${updateId} not found for update.`);
            results.push({ status: 'fulfilled', operation: 'update', data: updatedCountry });
            break;
          case 'delete':
            const deletedCountry = await Country.findByIdAndDelete(op.data.id);
            if (!deletedCountry) throw new Error(`Country with id ${op.data.id} not found for deletion.`);
            results.push({ status: 'fulfilled', operation: 'delete', data: { id: op.data.id } });
            break;
        }
      } catch (e: any) {
        results.push({ status: 'rejected', operation: op.operation, reason: e.message, data: op.data });
      }
    }
    
    const hasFailures = results.some(r => r.status === 'rejected');
    if (hasFailures) {
       console.error("Some country sync operations failed:", results.filter(r => r.status === 'rejected'));
    }

    return NextResponse.json({ success: true, results });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during sync process.';
    console.error('[API/countries/sync] Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
