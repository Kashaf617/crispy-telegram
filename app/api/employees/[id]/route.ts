import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';
import { getSession } from '@/lib/auth';
import AuditLog from '@/models/AuditLog';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const employee = await Employee.findById(id).lean();
    if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ employee });
  } catch (err) {
    console.error('[GET /api/employees/[id]]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const employee = await Employee.findByIdAndUpdate(id, body, { new: true });
    if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await AuditLog.create({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: 'UPDATE',
      resource: 'Employee',
      resourceId: id,
      details: body,
    });
    return NextResponse.json({ employee });
  } catch (err) {
    console.error('[PUT /api/employees/[id]]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await Employee.findByIdAndUpdate(id, { isActive: false });
    await AuditLog.create({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: 'DELETE',
      resource: 'Employee',
      resourceId: id,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/employees/[id]]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
