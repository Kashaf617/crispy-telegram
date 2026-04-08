import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Invoice from '@/models/Invoice';
import Batch from '@/models/Batch';
import PurchaseOrder from '@/models/PurchaseOrder';
import Employee from '@/models/Employee';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import Promotion from '@/models/Promotion';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId') || '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const branchFilter = branchId ? { branchId } : {};

    const now = new Date();
    const [todayInvoices, expiringBatches, pendingPOs, iqamaExpiring, activeProducts, totalCustomers, activePromos] = await Promise.all([
      Invoice.find({
        ...branchFilter,
        status: 'paid',
        createdAt: { $gte: today, $lt: tomorrow },
      }).lean(),
      Batch.find({
        ...branchFilter,
        status: 'active',
        expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        remainingQty: { $gt: 0 },
      }).lean(),
      PurchaseOrder.countDocuments({ ...branchFilter, status: { $in: ['draft', 'sent'] } }),
      Employee.countDocuments({
        ...branchFilter,
        isActive: true,
        iqamaExpiry: { $lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
      }),
      Product.countDocuments({ ...branchFilter, isActive: true }),
      Customer.countDocuments({ isActive: true }),
      Promotion.countDocuments({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } }),
    ]);

    const todaySales = todayInvoices.reduce((s, i) => s + i.grandTotal, 0);
    const todayVAT = todayInvoices.reduce((s, i) => s + i.vatTotal, 0);

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthInvoices = await Invoice.find({
      ...branchFilter,
      status: 'paid',
      createdAt: { $gte: thisMonthStart },
    }).lean();
    const monthRevenue = monthInvoices.reduce((s, i) => s + i.grandTotal, 0);

    return NextResponse.json({
      todaySales: parseFloat(todaySales.toFixed(2)),
      todayVAT: parseFloat(todayVAT.toFixed(2)),
      todayTransactions: todayInvoices.length,
      expiringItems: expiringBatches.length,
      pendingPOs,
      iqamaExpiring,
      monthRevenue: parseFloat(monthRevenue.toFixed(2)),
      monthTransactions: monthInvoices.length,
      activeProducts,
      totalCustomers,
      activePromos,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (err) {
    console.error('[GET /api/dashboard/stats]', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
