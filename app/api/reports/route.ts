import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Invoice from '@/models/Invoice';
import Batch from '@/models/Batch';
import Employee from '@/models/Employee';
import WastageLog from '@/models/WastageLog';

type SalesReportInvoice = {
  createdAt: string | Date;
  status: string;
  grandTotal: number;
  vatTotal: number;
  lines?: Array<{ name: string; qty: number; lineTotal: number }>;
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'sales';
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(new Date().setDate(1));
  const to   = searchParams.get('to')   ? new Date(searchParams.get('to')! + 'T23:59:59Z') : new Date();

  if (type === 'sales') {
    const invoices = await Invoice.find({
      createdAt: { $gte: from, $lte: to },
      status: { $in: ['paid', 'returned'] },
    }).lean() as unknown as SalesReportInvoice[];

    const dailyMap: Record<string, { date: string; sales: number; vat: number; transactions: number; returns: number }> = {};
    invoices.forEach(inv => {
      const d = new Date(String(inv.createdAt)).toISOString().slice(0, 10);
      if (!dailyMap[d]) dailyMap[d] = { date: d, sales: 0, vat: 0, transactions: 0, returns: 0 };
      if (inv.status === 'returned') {
        dailyMap[d].returns += inv.grandTotal;
      } else {
        dailyMap[d].sales += inv.grandTotal;
        dailyMap[d].vat   += inv.vatTotal;
        dailyMap[d].transactions += 1;
      }
    });

    const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    const totalSales  = daily.reduce((s, d) => s + d.sales, 0);
    const totalVAT    = daily.reduce((s, d) => s + d.vat, 0);
    const totalTx     = daily.reduce((s, d) => s + d.transactions, 0);
    const totalReturn = daily.reduce((s, d) => s + d.returns, 0);

    const topProducts: Record<string, { name: string; qty: number; revenue: number }> = {};
    invoices.filter(i => i.status === 'paid').forEach(inv => {
      (inv.lines || []).forEach((l: { name: string; qty: number; lineTotal: number }) => {
        if (!topProducts[l.name]) topProducts[l.name] = { name: l.name, qty: 0, revenue: 0 };
        topProducts[l.name].qty     += l.qty;
        topProducts[l.name].revenue += l.lineTotal;
      });
    });
    const topProductsList = Object.values(topProducts).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    return NextResponse.json({ daily, totalSales, totalVAT, totalTx, totalReturn, topProducts: topProductsList });
  }

  if (type === 'stock') {
    const batches = await Batch.find({}).populate('productId', 'name sku category').lean();
    const wastage = await WastageLog.find({ createdAt: { $gte: from, $lte: to } }).lean();
    const totalWastageCost = wastage.reduce((s: number, w: { costLoss: number }) => s + w.costLoss, 0);
    const lowStock = batches.filter((b: { remainingQty: number }) => b.remainingQty <= 5).length;
    const expired  = batches.filter((b: { status: string }) => b.status === 'expired').length;
    return NextResponse.json({ batches: batches.slice(0, 100), totalWastageCost, lowStock, expired, wastageCount: wastage.length });
  }

  if (type === 'hr') {
    const employees = await Employee.find({ isActive: true }).lean();
    const totalPayroll = employees.reduce((s: number, e: { salary: number }) => s + e.salary, 0);
    const expiring60 = employees.filter((e: { iqamaExpiry?: Date }) => {
      if (!e.iqamaExpiry) return false;
      const days = Math.ceil((new Date(e.iqamaExpiry).getTime() - Date.now()) / 86400000);
      return days >= 0 && days <= 60;
    }).length;
    return NextResponse.json({ employeeCount: employees.length, totalPayroll, expiring60, employees: employees.slice(0, 50) });
  }

  return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
}
