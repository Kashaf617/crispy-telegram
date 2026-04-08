import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Invoice from '@/models/Invoice';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const branchId = searchParams.get('branchId') || '';

    const query: Record<string, unknown> = { status: 'paid', type: 'sale' };
    if (branchId) query.branchId = branchId;
    if (from || to) {
      query.createdAt = {};
      if (from) (query.createdAt as Record<string, unknown>).$gte = new Date(from);
      if (to) (query.createdAt as Record<string, unknown>).$lte = new Date(to);
    }

    const invoices = await Invoice.find(query).sort({ createdAt: -1 }).lean();

    const totalSales = invoices.reduce((s, i) => s + i.grandTotal, 0);
    const totalVAT = invoices.reduce((s, i) => s + i.vatTotal, 0);
    const totalSubtotal = invoices.reduce((s, i) => s + i.subtotal, 0);

    return NextResponse.json({
      invoices,
      summary: {
        totalInvoices: invoices.length,
        totalSales: parseFloat(totalSales.toFixed(2)),
        totalVAT: parseFloat(totalVAT.toFixed(2)),
        totalSubtotal: parseFloat(totalSubtotal.toFixed(2)),
      },
    });
  } catch (err) {
    console.error('[GET /api/zatca]', err);
    return NextResponse.json({ error: 'Failed to fetch ZATCA data' }, { status: 500 });
  }
}
