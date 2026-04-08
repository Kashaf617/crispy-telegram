import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import StockTransfer from '@/models/StockTransfer';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const transfers = await StockTransfer.find({}).sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ transfers });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const count = await StockTransfer.countDocuments();
  const transferNumber = `TRF-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(count+1).padStart(4,'0')}`;
  const transfer = await StockTransfer.create({
    transferNumber,
    fromBranchId: body.fromBranchId,
    toBranchId: body.toBranchId,
    lines: body.lines,
    requestedBy: session.userId,
    notes: body.notes || '',
  });
  return NextResponse.json({ transfer }, { status: 201 });
}
