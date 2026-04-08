import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import GoodsReceipt from '@/models/GoodsReceipt';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const purchaseOrderId = searchParams.get('purchaseOrderId') || '';
    const vendorId = searchParams.get('vendorId') || '';
    const branchId = searchParams.get('branchId') || '';

    const query: Record<string, unknown> = {};
    if (purchaseOrderId) query.purchaseOrderId = purchaseOrderId;
    if (vendorId) query.vendorId = vendorId;
    if (branchId) query.branchId = branchId;

    const receipts = await GoodsReceipt.find(query)
      .populate('purchaseOrderId', 'poNumber status')
      .populate('vendorId', 'name nameAr code')
      .populate('receivedBy', 'name')
      .sort({ receivedDate: -1 })
      .lean();

    return NextResponse.json({ receipts });
  } catch (err) {
    console.error('[GET /api/goods-receipts]', err);
    return NextResponse.json({ error: 'Failed to fetch goods receipts' }, { status: 500 });
  }
}
