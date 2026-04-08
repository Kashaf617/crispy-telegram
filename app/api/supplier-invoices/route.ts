import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import AuditLog from '@/models/AuditLog';
import SupplierInvoice from '@/models/SupplierInvoice';
import Vendor from '@/models/Vendor';
import PurchaseOrder from '@/models/PurchaseOrder';
import { generateInvoiceNumber } from '@/lib/utils';

function resolveStatus(balanceDue: number, dueDate: Date, explicitStatus?: string) {
  if (explicitStatus === 'cancelled') return 'cancelled';
  if (balanceDue <= 0) return 'paid';
  if (balanceDue > 0 && explicitStatus === 'partial') return 'partial';
  if (balanceDue > 0 && dueDate.getTime() < Date.now()) return 'overdue';
  return 'posted';
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendorId') || '';
    const status = searchParams.get('status') || '';
    const purchaseOrderId = searchParams.get('purchaseOrderId') || '';
    const overdue = searchParams.get('overdue') === 'true';

    const query: Record<string, unknown> = {};
    if (vendorId) query.vendorId = vendorId;
    if (status) query.status = status;
    if (purchaseOrderId) query.purchaseOrderId = purchaseOrderId;
    if (overdue) {
      query.balanceDue = { $gt: 0 };
      query.dueDate = { $lt: new Date() };
      query.status = { $nin: ['paid', 'cancelled'] };
    }

    const invoices = await SupplierInvoice.find(query)
      .populate('vendorId', 'name nameAr code currentBalance paymentTerms')
      .populate('purchaseOrderId', 'poNumber status')
      .sort({ createdAt: -1 })
      .lean();

    const summary = invoices.reduce((acc, inv) => {
      acc.totalInvoiced += inv.grandTotal || 0;
      acc.totalPaid += inv.paidAmount || 0;
      acc.totalOutstanding += inv.balanceDue || 0;
      if ((inv.balanceDue || 0) > 0 && new Date(inv.dueDate).getTime() < Date.now() && inv.status !== 'cancelled') {
        acc.overdueCount += 1;
      }
      return acc;
    }, { totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0, overdueCount: 0 });

    return NextResponse.json({
      invoices,
      summary: {
        totalInvoiced: parseFloat(summary.totalInvoiced.toFixed(2)),
        totalPaid: parseFloat(summary.totalPaid.toFixed(2)),
        totalOutstanding: parseFloat(summary.totalOutstanding.toFixed(2)),
        overdueCount: summary.overdueCount,
      },
    });
  } catch (err) {
    console.error('[GET /api/supplier-invoices]', err);
    return NextResponse.json({ error: 'Failed to fetch supplier invoices' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.vendorId) return NextResponse.json({ error: 'Vendor is required' }, { status: 400 });

    const po = body.purchaseOrderId ? await PurchaseOrder.findById(body.purchaseOrderId).lean() : null;
    const lines = Array.isArray(body.lines) && body.lines.length > 0 ? body.lines : (po?.lines || []);
    if (!lines.length) return NextResponse.json({ error: 'Invoice lines are required' }, { status: 400 });

    const subtotal = parseFloat((body.subtotal ?? lines.reduce((s: number, l: { qty: number; unitCost: number }) => s + l.qty * l.unitCost, 0)).toFixed(2));
    const vatTotal = parseFloat((body.vatTotal ?? lines.reduce((s: number, l: { vatAmount?: number; qty: number; unitCost: number; vatRate?: number }) => s + (l.vatAmount ?? (l.qty * l.unitCost * (l.vatRate ?? 0.15))), 0)).toFixed(2));
    const grandTotal = parseFloat((body.grandTotal ?? subtotal + vatTotal).toFixed(2));
    const paidAmount = parseFloat(Number(body.paidAmount || 0).toFixed(2));
    const balanceDue = parseFloat(Math.max(0, grandTotal - paidAmount).toFixed(2));
    const dueDate = new Date(body.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    const invoice = await SupplierInvoice.create({
      invoiceNumber: body.invoiceNumber || generateInvoiceNumber('SINV'),
      vendorId: body.vendorId,
      purchaseOrderId: body.purchaseOrderId || undefined,
      supplierReference: body.supplierReference || undefined,
      invoiceDate: body.invoiceDate || new Date(),
      dueDate,
      lines,
      subtotal,
      vatTotal,
      grandTotal,
      paidAmount,
      balanceDue,
      status: resolveStatus(balanceDue, dueDate, body.status),
      payments: Array.isArray(body.payments) ? body.payments : [],
      notes: body.notes || undefined,
      branchId: body.branchId || session.branchId || '000000000000000000000001',
      createdBy: session.userId,
    });

    if (balanceDue > 0) {
      await Vendor.findByIdAndUpdate(body.vendorId, { $inc: { currentBalance: balanceDue } });
    }

    await AuditLog.create({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: 'CREATE',
      resource: 'SupplierInvoice',
      resourceId: invoice._id.toString(),
      details: { invoiceNumber: invoice.invoiceNumber, vendorId: body.vendorId, grandTotal, balanceDue },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /api/supplier-invoices]', err);
    const message = err instanceof Error ? err.message : 'Failed to create supplier invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
