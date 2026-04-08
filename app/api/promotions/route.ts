import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Promotion from '@/models/Promotion';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const active = searchParams.get('active');
  const query: Record<string, unknown> = {};
  if (active === 'true') {
    const now = new Date();
    query.isActive = true;
    query.startDate = { $lte: now };
    query.endDate = { $gte: now };
  }
  const promotions = await Promotion.find(query).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ promotions });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['developer', 'super_admin', 'admin'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await connectDB();
  const body = await req.json();
  const promotion = await Promotion.create({
    ...body,
    branchId: body.branchId || '000000000000000000000001',
  });
  return NextResponse.json({ promotion }, { status: 201 });
}
