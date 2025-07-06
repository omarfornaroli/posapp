// src/api/languages/sync/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import AppLanguage from '@/models/AppLanguage';
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
            const newLang = await AppLanguage.create(createData);
            results.push({ status: 'fulfilled', operation: 'create', data: newLang });
            break;
          case 'update':
            const { id: updateId, ...updateData } = op.data;
            // If the update sets a language to default, the pre-save hook on the model will handle unsetting others.
            const updatedLang = await AppLanguage.findByIdAndUpdate(updateId, updateData, { new: true });
            if (!updatedLang) throw new Error(`Language with id ${updateId} not found for update.`);
            results.push({ status: 'fulfilled', operation: 'update', data: updatedLang });
            break;
          case 'delete':
            const deletedLang = await AppLanguage.findByIdAndDelete(op.data.id);
            if (!deletedLang) throw new Error(`Language with id ${op.data.id} not found for deletion.`);
            results.push({ status: 'fulfilled', operation: 'delete', data: { id: op.data.id } });
            break;
        }
      } catch (e: any) {
        results.push({ status: 'rejected', operation: op.operation, reason: e.message, data: op.data });
      }
    }
    
    const hasFailures = results.some(r => r.status === 'rejected');
    if (hasFailures) {
       console.error("Some language sync operations failed:", results.filter(r => r.status === 'rejected'));
    }

    return NextResponse.json({ success: true, results });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during language sync process.';
    console.error('[API/languages/sync] Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
