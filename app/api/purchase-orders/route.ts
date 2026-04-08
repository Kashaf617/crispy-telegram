import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import PurchaseOrder from '@/models/PurchaseOrder';
import AuditLog from '@/models/AuditLog';
import { getSession } from '@/lib/auth';
import { generatePONumber } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const vendorId = searchParams.get('vendorId') || '';
    const branchId = searchParams.get('branchId') || '';
    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (vendorId) query.vendorId = vendorId;
    if (branchId) query.branchId = branchId;
    const orders = await PurchaseOrder.find(query)
      .populate('vendorId', 'name nameAr code')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ orders });
  } catch (err) {
    console.error('[GET /api/purchase-orders]', err);
    return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    if (!body.poNumber) body.poNumber = generatePONumber();
    body.createdBy = session.userId;
    const order = await PurchaseOrder.create(body);
    await AuditLog.create({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: 'CREATE',
      resource: 'PurchaseOrder',
      resourceId: order._id.toString(),
      details: { poNumber: order.poNumber },
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /api/purchase-orders]', err);
    const message = err instanceof Error ? err.message : 'Failed to create purchase order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
