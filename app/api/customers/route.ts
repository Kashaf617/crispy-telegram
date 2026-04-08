import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Customer from '@/models/Customer';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const query: Record<string, unknown> = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { customerCode: { $regex: search, $options: 'i' } },
    ];
  }
  const customers = await Customer.find(query).sort({ createdAt: -1 }).limit(200).lean();
  return NextResponse.json({ customers });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const count = await Customer.countDocuments();
  const customerCode = `CUST${String(count + 1).padStart(5, '0')}`;
  const customer = await Customer.create({
    ...body,
    customerCode,
    branchId: body.branchId || '000000000000000000000001',
  });
  return NextResponse.json({ customer }, { status: 201 });
}
