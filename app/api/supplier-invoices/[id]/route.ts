import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import AuditLog from '@/models/AuditLog';
import SupplierInvoice from '@/models/SupplierInvoice';
import Vendor from '@/models/Vendor';

function resolveStatus(balanceDue: number, dueDate: Date, currentStatus?: string) {
  if (currentStatus === 'cancelled') return 'cancelled';
  if (balanceDue <= 0) return 'paid';
  if (balanceDue > 0 && currentStatus === 'partial') return 'partial';
  if (balanceDue > 0 && dueDate.getTime() < Date.now()) return 'overdue';
  return 'posted';
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const invoice = await SupplierInvoice.findById(id)
      .populate('vendorId', 'name nameAr code currentBalance paymentTerms')
      .populate('purchaseOrderId', 'poNumber status')
      .lean();
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ invoice });
  } catch (err) {
    console.error('[GET /api/supplier-invoices/[id]]', err);
    return NextResponse.json({ error: 'Failed to fetch supplier invoice' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const invoice = await SupplierInvoice.findById(id);
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (body.action === 'record_payment') {
      const amount = Number(body.amount || 0);
      if (amount <= 0) return NextResponse.json({ error: 'Valid payment amount is required' }, { status: 400 });
      if (amount > invoice.balanceDue) return NextResponse.json({ error: 'Payment exceeds balance due' }, { status: 400 });

      invoice.payments.push({
        amount,
        method: body.method || 'bank_transfer',
        reference: body.reference || undefined,
        note: body.note || undefined,
        paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
      });
      invoice.paidAmount = parseFloat((invoice.paidAmount + amount).toFixed(2));
      invoice.balanceDue = parseFloat(Math.max(0, invoice.grandTotal - invoice.paidAmount).toFixed(2));
      invoice.status = resolveStatus(invoice.balanceDue, new Date(invoice.dueDate), invoice.balanceDue > 0 ? 'partial' : 'paid');
      await invoice.save();

      await Vendor.findByIdAndUpdate(invoice.vendorId, { $inc: { currentBalance: -amount } });

      await AuditLog.create({
        userId: session.userId,
        userName: session.name,
        userRole: session.role,
        action: 'UPDATE',
        resource: 'SupplierInvoice',
        resourceId: id,
        details: { type: 'payment', amount, balanceDue: invoice.balanceDue },
      });

      return NextResponse.json({ invoice });
    }

    if (typeof body.status === 'string') {
      const previousBalance = invoice.balanceDue;
      invoice.status = body.status;
      if (body.status === 'cancelled' && previousBalance > 0) {
        await Vendor.findByIdAndUpdate(invoice.vendorId, { $inc: { currentBalance: -previousBalance } });
        invoice.balanceDue = 0;
      }
      await invoice.save();

      await AuditLog.create({
        userId: session.userId,
        userName: session.name,
        userRole: session.role,
        action: 'UPDATE',
        resource: 'SupplierInvoice',
        resourceId: id,
        details: { status: body.status },
      });

      return NextResponse.json({ invoice });
    }

    return NextResponse.json({ error: 'Unsupported update action' }, { status: 400 });
  } catch (err: unknown) {
    console.error('[PUT /api/supplier-invoices/[id]]', err);
    const message = err instanceof Error ? err.message : 'Failed to update supplier invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
