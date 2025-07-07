// src/api/payment-methods/sync/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import PaymentMethod from '@/models/PaymentMethod';
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
            const newPaymentMethod = await PaymentMethod.create(createData);
            results.push({ status: 'fulfilled', operation: 'create', data: newPaymentMethod });
            break;
          case 'update':
            const { id: updateId, ...updateData } = op.data;
            const updatedPaymentMethod = await PaymentMethod.findByIdAndUpdate(updateId, updateData, { new: true });
            if (!updatedPaymentMethod) throw new Error(`PaymentMethod with id ${updateId} not found for update.`);
            results.push({ status: 'fulfilled', operation: 'update', data: updatedPaymentMethod });
            break;
          case 'delete':
            const deletedPaymentMethod = await PaymentMethod.findByIdAndDelete(op.data.id);
            if (!deletedPaymentMethod) throw new Error(`PaymentMethod with id ${op.data.id} not found for deletion.`);
            results.push({ status: 'fulfilled', operation: 'delete', data: { id: op.data.id } });
            break;
        }
      } catch (e: any) {
        results.push({ status: 'rejected', operation: op.operation, reason: e.message, data: op.data });
      }
    }
    
    const hasFailures = results.some(r => r.status === 'rejected');
    if (hasFailures) {
       console.error("Some payment method sync operations failed:", results.filter(r => r.status === 'rejected'));
    }

    return NextResponse.json({ success: true, results });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during sync process.';
    console.error('[API/payment-methods/sync] Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
