import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import PurchaseOrder from '@/models/PurchaseOrder';
import Batch from '@/models/Batch';
import GoodsReceipt from '@/models/GoodsReceipt';
import { getSession } from '@/lib/auth';
import AuditLog from '@/models/AuditLog';
import { generateInvoiceNumber } from '@/lib/utils';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const order = await PurchaseOrder.findById(id)
      .populate('vendorId')
      .populate('createdBy', 'name')
      .lean();
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ order });
  } catch (err) {
    console.error('[GET /api/purchase-orders/[id]]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();

    const existingOrder = await PurchaseOrder.findById(id);
    if (!existingOrder) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const wasReceived = existingOrder.status === 'received';
    const nextStatus = body.status || existingOrder.status;

    const order = await PurchaseOrder.findByIdAndUpdate(id, body, { new: true });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (nextStatus === 'received' && !wasReceived) {
      const lines = Array.isArray(body.lines) && body.lines.length > 0 ? body.lines : order.lines;
      const receiptLines = [];
      for (const line of lines) {
        const batchNumber = `PO-${order.poNumber}-${Date.now()}`;
        await Batch.create({
          productId: line.productId,
          batchNumber,
          vendorId: order.vendorId,
          purchaseOrderId: order._id,
          quantity: line.qty,
          remainingQty: line.qty,
          unit: line.unit,
          costPrice: line.unitCost * (order.landedCostFactor || 1),
          sellPrice: line.unitCost * 1.3,
          expiryDate: body.expiryDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          receivedDate: new Date(),
          branchId: order.branchId,
        });

        receiptLines.push({
          productId: line.productId,
          name: line.name,
          qty: line.qty,
          unit: line.unit,
          unitCost: line.unitCost,
          vatRate: line.vatRate,
          vatAmount: line.vatAmount,
          lineTotal: line.lineTotal,
          batchNumber,
          expiryDate: body.expiryDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        });
      }

      await GoodsReceipt.create({
        grnNumber: generateInvoiceNumber('GRN'),
        purchaseOrderId: order._id,
        vendorId: order.vendorId,
        lines: receiptLines,
        receivedDate: new Date(),
        notes: body.notes || order.notes,
        branchId: order.branchId,
        receivedBy: session.userId,
      });
    }

    await AuditLog.create({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: 'UPDATE',
      resource: 'PurchaseOrder',
      resourceId: id,
      details: { status: body.status },
    });

    return NextResponse.json({ order });
  } catch (err) {
    console.error('[PUT /api/purchase-orders/[id]]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
