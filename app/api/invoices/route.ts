import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Invoice from '@/models/Invoice';
import Batch from '@/models/Batch';
import Shift from '@/models/Shift';
import Customer from '@/models/Customer';
import Promotion from '@/models/Promotion';
import AuditLog from '@/models/AuditLog';
import { getSession } from '@/lib/auth';
import { generateInvoiceNumber } from '@/lib/utils';
import { generateZatcaQRCode } from '@/lib/zatca';
import { broadcastEvent } from '@/lib/realtime';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const branchId = searchParams.get('branchId') || '';
    const search = searchParams.get('search') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (branchId) query.branchId = branchId;
    if (search) query.invoiceNumber = { $regex: search, $options: 'i' };
    if (from || to) {
      query.createdAt = {};
      if (from) (query.createdAt as Record<string, unknown>).$gte = new Date(from);
      if (to) (query.createdAt as Record<string, unknown>).$lte = new Date(to);
    }

    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      Invoice.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Invoice.countDocuments(query),
    ]);

    return NextResponse.json({ invoices, total, page, limit });
  } catch (err) {
    console.error('[GET /api/invoices]', err);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const invoiceNumber = body.invoiceNumber || generateInvoiceNumber('INV');

    const { qrDataUrl: zatcaQR } = await generateZatcaQRCode(
      process.env.ZATCA_SELLER_NAME || 'SaudiMart Trading Co.',
      process.env.ZATCA_VAT_NUMBER || '300000000000003',
      body.grandTotal || 0,
      body.vatTotal || 0
    );

    const invoice = await Invoice.create({
      ...body,
      invoiceNumber,
      zatcaQR,
      cashierId: session.userId,
      cashierName: session.name,
    });

    if (body.lines && Array.isArray(body.lines)) {
      for (const line of body.lines) {
        if (line.batchId) {
          await Batch.findByIdAndUpdate(line.batchId, {
            $inc: { remainingQty: -line.qty },
          });
          const batch = await Batch.findById(line.batchId);
          if (batch && batch.remainingQty <= 0) {
            await Batch.findByIdAndUpdate(line.batchId, { status: 'depleted' });
          }
        }
      }
    }

    await AuditLog.create({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: 'CREATE',
      resource: 'Invoice',
      resourceId: invoice._id.toString(),
      details: { invoiceNumber, grandTotal: body.grandTotal },
    });

    if (body.type === 'sale') {
      if (body.customerId) {
        const loyaltyEarned = Math.floor((body.grandTotal || 0) / 10);
        await Customer.findByIdAndUpdate(body.customerId, {
          $inc: { loyaltyPoints: loyaltyEarned, totalSpent: body.grandTotal || 0, visitCount: 1 },
        });
      }
      if (body.promotionCode) {
        await Promotion.findOneAndUpdate(
          { code: body.promotionCode },
          { $inc: { usedCount: 1 } }
        );
      }
    }

    if (body.type === 'sale' && body.payments) {
      const cashPaid    = body.payments.filter((p: { method: string }) => p.method === 'cash').reduce((s: number, p: { amount: number }) => s + p.amount, 0);
      const cardPaid    = body.payments.filter((p: { method: string }) => p.method === 'card').reduce((s: number, p: { amount: number }) => s + p.amount, 0);
      const loyaltyPaid = body.payments.filter((p: { method: string }) => p.method === 'loyalty').reduce((s: number, p: { amount: number }) => s + p.amount, 0);
      await Shift.findOneAndUpdate(
        { cashierId: session.userId, status: 'open' },
        {
          $inc: {
            totalSales: body.grandTotal || 0,
            totalCash: cashPaid,
            totalCard: cardPaid,
            totalLoyalty: loyaltyPaid,
            transactionCount: 1,
          },
        }
      );
    }

    broadcastEvent('invoice:created', {
      invoiceId: invoice._id,
      invoiceNumber,
      grandTotal: body.grandTotal,
      branchId: body.branchId,
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /api/invoices]', err);
    const message = err instanceof Error ? err.message : 'Failed to create invoice';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
