import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { getSession } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !['developer', 'super_admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const body = await req.json();
    const { id } = await params;
    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isActive: body.isActive, updatedAt: new Date() } },
      { new: true }
    ).select('-password').lean();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    await AuditLog.create({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: body.isActive ? 'enable_user' : 'disable_user',
      resource: 'User',
      resourceId: id,
      details: { targetUser: (user as { email?: string }).email },
    });
    return NextResponse.json({ user });
  } catch (err) {
    console.error('[PUT /api/users/[id]]', err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'developer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { id } = await params;
    await User.findByIdAndUpdate(id, { isActive: false });
    await AuditLog.create({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: 'delete_user',
      resource: 'User',
      resourceId: id,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/users/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
