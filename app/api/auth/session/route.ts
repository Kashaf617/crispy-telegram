import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const session = await getSession();

  if (!session) {
    const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    response.cookies.delete('auth_token');
    return response;
  }

  await connectDB();
  const user = await User.findOne({ _id: session.userId, isActive: true });

  if (!user) {
    const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    response.cookies.delete('auth_token');
    return response;
  }

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      nameAr: user.nameAr,
      email: user.email,
      role: user.role,
      branchId: user.branchId?.toString(),
    },
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
