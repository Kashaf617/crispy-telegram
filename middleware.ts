import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import type { UserRole } from '@/types';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'saudimart_secret_key_change_in_production_32chars'
);

const PROTECTED_ROUTES: Record<string, UserRole[]> = {
  '/pos': ['developer', 'super_admin', 'admin', 'cashier'],
  '/inventory': ['developer', 'super_admin', 'admin', 'inventory_manager'],
  '/procurement': ['developer', 'super_admin', 'admin', 'inventory_manager', 'accountant'],
  '/hr': ['developer', 'super_admin', 'admin'],
  '/finance': ['developer', 'super_admin', 'admin', 'accountant'],
  '/developer': ['developer'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;

  if (pathname.startsWith('/login')) {
    if (token) {
      try {
        await jwtVerify(token, SECRET);
        return NextResponse.redirect(new URL('/', request.url));
      } catch {
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const role = payload.role as UserRole;

    const matchedRoute = Object.keys(PROTECTED_ROUTES).find((route) =>
      pathname.includes(route)
    );

    if (matchedRoute) {
      const allowedRoles = PROTECTED_ROUTES[matchedRoute];
      if (!allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL('/?error=unauthorized', request.url));
      }
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-role', role);
    requestHeaders.set('x-user-name', payload.name as string);
    requestHeaders.set('x-branch-id', (payload.branchId as string) || '');

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth_token');
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
