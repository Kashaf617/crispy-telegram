'use client';
import { useState, useEffect } from 'react';
import type { UserRole } from '@/types';

interface AuthUser {
  id: string;
  name: string;
  nameAr: string;
  email: string;
  role: UserRole;
  branchId?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function restoreUser() {
      const stored = sessionStorage.getItem('saudimart_user');

      if (stored) {
        try {
          const parsed = JSON.parse(stored) as AuthUser;
          if (mounted) setUser(parsed);
          return;
        } catch {
          sessionStorage.removeItem('saudimart_user');
        }
      }

      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });

        if (!res.ok) {
          sessionStorage.removeItem('saudimart_user');
          return;
        }

        const data = await res.json() as { user: AuthUser };
        sessionStorage.setItem('saudimart_user', JSON.stringify(data.user));

        if (mounted) setUser(data.user);
      } catch {
        sessionStorage.removeItem('saudimart_user');
      }
    }

    void restoreUser().finally(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    sessionStorage.setItem('saudimart_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    sessionStorage.removeItem('saudimart_user');
    setUser(null);
    window.location.href = '/login';
  };

  return { user, loading, login, logout };
}
