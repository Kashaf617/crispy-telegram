import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import AuditLog from '@/models/AuditLog';
import HardwareSettings from '@/models/HardwareSettings';
import { mergeHardwareSettings, mergeHardwareTests } from '@/lib/hardware';

const EDIT_ROLES = ['developer', 'super_admin', 'admin'];

function resolveBranchId(sessionBranchId?: string | null, requestBranchId?: string | null) {
  return requestBranchId || sessionBranchId || '000000000000000000000001';
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const branchId = resolveBranchId(session.branchId, searchParams.get('branchId'));
    const record = await HardwareSettings.findOne({ branchId }).lean();

    return NextResponse.json({
      settings: mergeHardwareSettings(record?.settings || null),
      testResults: mergeHardwareTests(record?.testResults || null),
      updatedAt: record?.updatedAt || null,
    });
  } catch (err) {
    console.error('[GET /api/hardware-settings]', err);
    return NextResponse.json({ error: 'Failed to fetch hardware settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!EDIT_ROLES.includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const branchId = resolveBranchId(session.branchId, body.branchId);
    const existing = await HardwareSettings.findOne({ branchId }).lean();
    const settings = mergeHardwareSettings(body.settings || existing?.settings || null);
    const testResults = mergeHardwareTests(existing?.testResults || null);

    const record = await HardwareSettings.findOneAndUpdate(
      { branchId },
      {
        $set: {
          settings,
          testResults,
          updatedBy: session.userId,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    await AuditLog.create({
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      action: existing ? 'UPDATE' : 'CREATE',
      resource: 'HardwareSettings',
      resourceId: record?._id?.toString(),
      details: { branchId },
    });

    return NextResponse.json({
      settings: mergeHardwareSettings(record?.settings || null),
      testResults: mergeHardwareTests(record?.testResults || null),
      updatedAt: record?.updatedAt || null,
    });
  } catch (err) {
    console.error('[PUT /api/hardware-settings]', err);
    return NextResponse.json({ error: 'Failed to save hardware settings' }, { status: 500 });
  }
}
