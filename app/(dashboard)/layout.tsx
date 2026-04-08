'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ShieldCheck, Sparkles } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import CommandPalette from '@/components/CommandPalette';
import { useLang } from '@/contexts/LanguageContext';
import type { UserRole } from '@/types';

interface StoredUser {
  id: string;
  name: string;
  nameAr: string;
  email: string;
  role: UserRole;
  branchId?: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLang();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  const currentSection = pathname === '/'
    ? t('Executive Dashboard', 'لوحة القيادة التنفيذية')
    : t(
      pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Workspace',
      pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'مساحة العمل'
    );

  useEffect(() => {
    let mounted = true;

    async function restoreUser() {
      const stored = sessionStorage.getItem('saudimart_user');

      if (stored) {
        try {
          const parsed = JSON.parse(stored) as StoredUser;
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
          router.push('/login');
          return;
        }

        const data = await res.json() as { user: StoredUser };
        sessionStorage.setItem('saudimart_user', JSON.stringify(data.user));

        if (mounted) setUser(data.user);
      } catch {
        sessionStorage.removeItem('saudimart_user');
        router.push('/login');
      }
    }

    void restoreUser();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <div className="w-5 h-5 border-2 border-emerald-500/40 border-t-emerald-500 rounded-full animate-spin" />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar
        role={user.role}
        userName={user.name}
        nameAr={user.nameAr}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header bar */}
        <header className="px-5 lg:px-8 py-4 flex-shrink-0"
          style={{ background: 'color-mix(in srgb, var(--bg-surface) 88%, transparent 12%)', borderBottom: '1px solid var(--border-color)', backdropFilter: 'blur(16px)' }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="hidden sm:flex w-11 h-11 rounded-2xl items-center justify-center emerald-glow"
                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(59,130,246,0.16))', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                  <span>SaudiMart ERP</span>
                  <span style={{ color: 'var(--border-color)' }}>/</span>
                  <span>{currentSection}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <h1 className="text-lg lg:text-xl font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {t('Operational Workspace', 'مساحة العمل التشغيلية')}
                  </h1>
                  <span className="badge badge-emerald">
                    {t('Secure Session', 'جلسة آمنة')}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  {t('Manage retail operations, finance, inventory, and compliance from one smart workspace.', 'قم بإدارة المبيعات والمالية والمخزون والامتثال من مساحة عمل ذكية واحدة.')}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={() => setCmdOpen(true)}
                className="hidden sm:flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition-all surface-panel"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Search className="w-4 h-4" />
                <span>{t('Search pages, tools, or commands', 'ابحث عن الصفحات أو الأدوات أو الأوامر')}</span>
                <kbd className="px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>Ctrl K</kbd>
              </button>
              <div className="surface-panel px-4 py-3 rounded-2xl flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold"
                  style={{ background: 'linear-gradient(135deg, #10b981, #2563eb)' }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{user.role.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} userRole={user.role} />}
    </div>
  );
}
