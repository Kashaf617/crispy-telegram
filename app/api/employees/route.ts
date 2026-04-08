import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Employee from '@/models/Employee';
import AuditLog from '@/models/AuditLog';
import { getSession } from '@/lib/auth';
import { generateEmployeeId } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const branchId = searchParams.get('branchId') || '';
    const query: Record<string, unknown> = { isActive: true };
    if (branchId) query.branchId = branchId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameAr: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }
    const employees = await Employee.find(query).sort({ name: 1 }).lean();
    return NextResponse.json({ employees });
  } catch (err) {
    console.error('[GET /api/employees]', err);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    if (!body.employeeId) body.employeeId = generateEmployeeId();
    const employee = await Employee.create(body);
    await AuditLog.create({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: 'CREATE',
      resource: 'Employee',
      resourceId: employee._id.toString(),
      details: { employeeId: employee.employeeId, name: employee.name },
    });
    return NextResponse.json({ employee }, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /api/employees]', err);
    const message = err instanceof Error ? err.message : 'Failed to create employee';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
