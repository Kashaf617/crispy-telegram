import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import Promotion from '@/models/Promotion';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const promotion = await Promotion.findByIdAndUpdate(id, body, { new: true });
  if (!promotion) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ promotion });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { id } = await params;
  await Promotion.findByIdAndUpdate(id, { isActive: false });
  return NextResponse.json({ success: true });
}
