import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import StockTransfer from '@/models/StockTransfer';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const transfer = await StockTransfer.findByIdAndUpdate(id, body, { new: true });
  if (!transfer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ transfer });
}
