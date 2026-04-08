import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import AuditLog from '@/models/AuditLog';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const resource = searchParams.get('resource') || '';
    const userId = searchParams.get('userId') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    const page = parseInt(searchParams.get('page') || '1');

    const query: Record<string, unknown> = {};
    if (resource) query.resource = resource;
    if (userId) query.userId = userId;

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query),
    ]);

    return NextResponse.json({ logs, total, page, limit });
  } catch (err) {
    console.error('[GET /api/audit-logs]', err);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
