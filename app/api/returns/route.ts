import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Return from '@/models/Return';
import Invoice from '@/models/Invoice';
import Shift from '@/models/Shift';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const returns = await Return.find({}).sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ returns });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const body = await req.json();

  const origInvoice = await Invoice.findById(body.originalInvoiceId);
  if (!origInvoice) return NextResponse.json({ error: 'Original invoice not found' }, { status: 404 });

  const count = await Return.countDocuments();
  const returnNumber = `RTN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(count+1).padStart(4,'0')}`;

  const ret = await Return.create({
    returnNumber,
    originalInvoiceId: body.originalInvoiceId,
    originalInvoiceNumber: origInvoice.invoiceNumber,
    customerId: body.customerId,
    lines: body.lines,
    subtotal: body.subtotal,
    vatTotal: body.vatTotal,
    grandTotal: body.grandTotal,
    reason: body.reason,
    refundMethod: body.refundMethod,
    processedBy: session.userId,
    branchId: body.branchId || '000000000000000000000001',
  });

  await Invoice.findByIdAndUpdate(body.originalInvoiceId, { status: 'returned' });

  await Shift.findOneAndUpdate(
    { cashierId: session.userId, status: 'open' },
    { $inc: { totalReturns: ret.grandTotal } }
  );

  return NextResponse.json({ return: ret }, { status: 201 });
}
