import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Shift from '@/models/Shift';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  const shifts = await Shift.find(query).sort({ openedAt: -1 }).limit(50).lean();
  return NextResponse.json({ shifts });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const body = await req.json();

  if (body.action === 'open') {
    const existing = await Shift.findOne({ cashierId: session.userId, status: 'open' });
    if (existing) return NextResponse.json({ error: 'You already have an open shift', shift: existing }, { status: 400 });
    const count = await Shift.countDocuments();
    const shiftNumber = `SHF-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(count+1).padStart(4,'0')}`;
    const shift = await Shift.create({
      shiftNumber,
      cashierId: session.userId,
      cashierName: session.name,
      branchId: body.branchId || '000000000000000000000001',
      openingFloat: body.openingFloat || 0,
      openedAt: new Date(),
    });
    return NextResponse.json({ shift }, { status: 201 });
  }

  if (body.action === 'close') {
    const shift = await Shift.findOne({ cashierId: session.userId, status: 'open' });
    if (!shift) return NextResponse.json({ error: 'No open shift found' }, { status: 404 });
    const expectedCash = shift.openingFloat + shift.totalCash - shift.totalReturns;
    const variance = (body.closingFloat || 0) - expectedCash;
    await Shift.findByIdAndUpdate(shift._id, {
      status: 'closed',
      closingFloat: body.closingFloat || 0,
      denominations: body.denominations || [],
      expectedCash,
      cashVariance: variance,
      closedAt: new Date(),
      notes: body.notes || '',
    });
    return NextResponse.json({ success: true, variance });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
