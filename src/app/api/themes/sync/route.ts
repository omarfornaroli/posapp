// src/api/themes/sync/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Theme from '@/models/Theme';
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
            const newTheme = await Theme.create(createData);
            results.push({ status: 'fulfilled', operation: 'create', data: newTheme });
            break;
          case 'update':
            const { id: updateId, ...updateData } = op.data;
            const updatedTheme = await Theme.findByIdAndUpdate(updateId, updateData, { new: true });
            if (!updatedTheme) throw new Error(`Theme with id ${updateId} not found for update.`);
            results.push({ status: 'fulfilled', operation: 'update', data: updatedTheme });
            break;
          case 'delete':
            const deletedTheme = await Theme.findByIdAndDelete(op.data.id);
            if (!deletedTheme) throw new Error(`Theme with id ${op.data.id} not found for deletion.`);
            results.push({ status: 'fulfilled', operation: 'delete', data: { id: op.data.id } });
            break;
        }
      } catch (e: any) {
        results.push({ status: 'rejected', operation: op.operation, reason: e.message, data: op.data });
      }
    }
    
    const hasFailures = results.some(r => r.status === 'rejected');
    if (hasFailures) {
       console.error("Some theme sync operations failed:", results.filter(r => r.status === 'rejected'));
    }

    return NextResponse.json({ success: true, results });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during theme sync process.';
    console.error('[API/themes/sync] Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
