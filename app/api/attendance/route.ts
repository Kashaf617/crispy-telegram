import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId') || '';
    const date = searchParams.get('date');
    const query: Record<string, unknown> = {};
    if (employeeId) query.employeeId = employeeId;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }
    const records = await Attendance.find(query)
      .populate('employeeId', 'name nameAr employeeId')
      .sort({ date: -1 })
      .lean();
    return NextResponse.json({ records });
  } catch (err) {
    console.error('[GET /api/attendance]', err);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { employeeId, action } = body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let record = await Attendance.findOne({ employeeId, date: { $gte: today } });

    if (!record) {
      record = await Attendance.create({
        employeeId,
        date: new Date(),
        clockIn: action === 'clockIn' ? new Date() : undefined,
        status: 'present',
      });
    } else if (action === 'clockOut' && record.clockIn) {
      const now = new Date();
      const hoursWorked = (now.getTime() - record.clockIn.getTime()) / (1000 * 60 * 60);
      record.clockOut = now;
      record.hoursWorked = parseFloat(hoursWorked.toFixed(2));
      await record.save();
    }

    return NextResponse.json({ record }, { status: 201 });
  } catch (err: unknown) {
    console.error('[POST /api/attendance]', err);
    const message = err instanceof Error ? err.message : 'Failed to record attendance';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
