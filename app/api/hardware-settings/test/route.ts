import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import AuditLog from '@/models/AuditLog';
import HardwareSettings from '@/models/HardwareSettings';
import {
  HARDWARE_DEVICE_KEYS,
  mergeHardwareSettings,
  mergeHardwareTests,
} from '@/lib/hardware';
import type { HardwareDeviceKey, HardwareTestStatus } from '@/types';

const EDIT_ROLES = ['developer', 'super_admin', 'admin'];
const TEST_STATUSES: HardwareTestStatus[] = ['idle', 'testing', 'ok', 'fail'];

function resolveBranchId(sessionBranchId?: string | null, requestBranchId?: string | null) {
  return requestBranchId || sessionBranchId || '000000000000000000000001';
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!EDIT_ROLES.includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const deviceKey = body.deviceKey as HardwareDeviceKey;
    const status = body.status as HardwareTestStatus;
    if (!HARDWARE_DEVICE_KEYS.includes(deviceKey)) {
      return NextResponse.json({ error: 'Invalid device key' }, { status: 400 });
    }
    if (!TEST_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid test status' }, { status: 400 });
    }

    const branchId = resolveBranchId(session.branchId, body.branchId);
    const existing = await HardwareSettings.findOne({ branchId }).lean();
    const settings = mergeHardwareSettings(existing?.settings || null);
    const testResults = mergeHardwareTests(existing?.testResults || null);
    testResults[deviceKey] = {
      status,
      testedAt: new Date(),
      testedBy: session.name,
      note: typeof body.note === 'string' ? body.note : undefined,
    };

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
      action: 'UPDATE',
      resource: 'HardwareDeviceTest',
      resourceId: record?._id?.toString(),
      details: { branchId, deviceKey, status, note: body.note || null },
    });

    return NextResponse.json({
      settings: mergeHardwareSettings(record?.settings || null),
      testResults: mergeHardwareTests(record?.testResults || null),
      updatedAt: record?.updatedAt || null,
    });
  } catch (err) {
    console.error('[POST /api/hardware-settings/test]', err);
    return NextResponse.json({ error: 'Failed to record hardware test result' }, { status: 500 });
  }
}
