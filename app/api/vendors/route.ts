import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Vendor from '@/models/Vendor';
import AuditLog from '@/models/AuditLog';
import { getSession } from '@/lib/auth';
import { generateVendorCode } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameAr: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];
    }
    const vendors = await Vendor.find(query).sort({ name: 1 }).lean();
    return NextResponse.json({ vendors });
  } catch (err) {
    console.error('[GET /api/vendors]', err);
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.code) body.code = generateVendorCode();
    const vendor = await Vendor.create(body);

    await AuditLog.create({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: 'CREATE',
      resource: 'Vendor',
      resourceId: vendor._id.toString(),
      details: { code: vendor.code, name: vendor.name },
    });

    return NextResponse.json({ vendor }, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /api/vendors]', err);
    const message = err instanceof Error ? err.message : 'Failed to create vendor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
