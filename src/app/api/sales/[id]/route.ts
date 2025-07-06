
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SaleTransaction from '@/models/SaleTransaction';

interface Params {
  id: string;
}

export async function GET(request: Request, { params }: { params: Params }) {
  const { id } = params;
  await dbConnect();

  try {
    const sale = await SaleTransaction.findById(id);
    if (!sale) {
      return NextResponse.json({ success: false, error: 'Sale transaction not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: sale });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
