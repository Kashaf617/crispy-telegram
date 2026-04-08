import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Vendor from '@/models/Vendor';
import { getSession } from '@/lib/auth';
import AuditLog from '@/models/AuditLog';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const vendor = await Vendor.findById(id).lean();
    if (!vendor) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ vendor });
  } catch (err) {
    console.error('[GET /api/vendors/[id]]', err);
    return NextResponse.json({ error: 'Failed to fetch vendor' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const vendor = await Vendor.findByIdAndUpdate(id, body, { new: true });
    if (!vendor) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await AuditLog.create({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: 'UPDATE',
      resource: 'Vendor',
      resourceId: id,
      details: body,
    });
    return NextResponse.json({ vendor });
  } catch (err) {
    console.error('[PUT /api/vendors/[id]]', err);
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await Vendor.findByIdAndUpdate(id, { isActive: false });
    await AuditLog.create({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: 'DELETE',
      resource: 'Vendor',
      resourceId: id,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/vendors/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 });
  }
}
