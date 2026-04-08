import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { signToken } from '@/lib/auth';
import AuditLog from '@/models/AuditLog';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      branchId: user.branchId?.toString(),
      name: user.name,
    });

    await AuditLog.create({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: 'LOGIN',
      resource: 'auth',
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        nameAr: user.nameAr,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
      },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[AUTH LOGIN]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
