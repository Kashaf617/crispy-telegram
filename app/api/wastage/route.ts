import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import WastageLog from '@/models/WastageLog';
import Batch from '@/models/Batch';
import AuditLog from '@/models/AuditLog';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId') || '';
    const query: Record<string, unknown> = {};
    if (branchId) query.branchId = branchId;
    const logs = await WastageLog.find(query)
      .populate('productId', 'name nameAr sku')
      .populate('recordedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ logs });
  } catch (err) {
    console.error('[GET /api/wastage]', err);
    return NextResponse.json({ error: 'Failed to fetch wastage logs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    body.recordedBy = session.userId;
    const log = await WastageLog.create(body);

    if (body.batchId) {
      await Batch.findByIdAndUpdate(body.batchId, {
        $inc: { remainingQty: -body.quantity },
      });
    }

    await AuditLog.create({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: 'CREATE',
      resource: 'WastageLog',
      resourceId: log._id.toString(),
      details: { reason: body.reason, quantity: body.quantity },
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /api/wastage]', err);
    const message = err instanceof Error ? err.message : 'Failed to log wastage';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
