import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { JWTPayload, UserRole } from '@/types';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'saudimart_secret_key_change_in_production_32chars'
);

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  developer: ['*'],
  super_admin: ['dashboard', 'pos', 'inventory', 'procurement', 'hr', 'finance', 'developer'],
  admin: ['dashboard', 'pos', 'inventory', 'procurement', 'hr', 'finance'],
  inventory_manager: ['dashboard', 'inventory', 'procurement'],
  cashier: ['dashboard', 'pos'],
  accountant: ['dashboard', 'finance', 'procurement'],
};

export function hasPermission(role: UserRole, resource: string): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes('*') || perms.includes(resource);
}

export function getAllowedRoutes(role: UserRole): string[] {
  const perms = ROLE_PERMISSIONS[role] || [];
  if (perms.includes('*')) return ['dashboard', 'pos', 'inventory', 'procurement', 'hr', 'finance', 'developer'];
  return perms.filter((p) => p !== 'dashboard');
}
