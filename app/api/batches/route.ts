import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Batch from '@/models/Batch';
import AuditLog from '@/models/AuditLog';
import { getSession } from '@/lib/auth';
import { broadcastEvent } from '@/lib/realtime';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId') || '';
    const branchId = searchParams.get('branchId') || '';
    const status = searchParams.get('status') || '';
    const expiringDays = searchParams.get('expiringDays');

    const query: Record<string, unknown> = {};
    if (productId) query.productId = productId;
    if (branchId) query.branchId = branchId;
    if (status) query.status = status;
    if (expiringDays) {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() + parseInt(expiringDays));
      query.expiryDate = { $lte: threshold };
      query.status = 'active';
      query.remainingQty = { $gt: 0 };
    }

    const batches = await Batch.find(query)
      .populate('productId', 'name nameAr sku unit')
      .populate('vendorId', 'name nameAr')
      .sort({ expiryDate: 1 })
      .lean();

    return NextResponse.json({ batches });
  } catch (err) {
    console.error('[GET /api/batches]', err);
    return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    body.remainingQty = body.quantity;
    const batch = await Batch.create(body);

    await AuditLog.create({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: 'CREATE',
      resource: 'Batch',
      resourceId: batch._id.toString(),
      details: { batchNumber: batch.batchNumber },
    });

    broadcastEvent('batch:created', { batchId: batch._id, productId: batch.productId });

    return NextResponse.json({ batch }, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /api/batches]', err);
    const message = err instanceof Error ? err.message : 'Failed to create batch';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
