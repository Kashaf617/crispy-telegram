'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, ShoppingCart, Package, Truck, Users,
  DollarSign, Code2, ChevronLeft, ChevronRight, Globe, LogOut,
  Sun, Moon, Store, UserCircle, Tag, Percent, Wallet, Sparkles, ShieldCheck,
  BarChart2, RotateCcw, ArrowLeftRight, Cpu,
} from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { UserRole } from '@/types';

const ALL_ROLES = ['developer','super_admin','admin','inventory_manager','cashier','accountant'] as const;

interface NavItem {
  href: string;
  icon: React.ElementType;
  en: string;
  ar: string;
  roles: string[];
}
interface NavGroup {
  groupEn: string;
  groupAr: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupEn: 'OVERVIEW', groupAr: 'نظرة عامة',
    items: [
      { href: '/',        icon: LayoutDashboard, en: 'Dashboard',   ar: 'لوحة التحكم',   roles: [...ALL_ROLES] },
      { href: '/reports', icon: BarChart2,       en: 'Reports',     ar: 'التقارير',      roles: ['developer','super_admin','admin','accountant'] },
    ],
  },
  {
    groupEn: 'SALES', groupAr: 'المبيعات',
    items: [
      { href: '/pos',        icon: ShoppingCart, en: 'POS Billing',  ar: 'نقطة البيع',    roles: ['developer','super_admin','admin','cashier'] },
      { href: '/customers',  icon: UserCircle,   en: 'Customers',    ar: 'العملاء',       roles: ['developer','super_admin','admin','cashier'] },
      { href: '/promotions', icon: Percent,      en: 'Promotions',   ar: 'العروض',        roles: ['developer','super_admin','admin'] },
      { href: '/returns',    icon: RotateCcw,    en: 'Returns',      ar: 'المرتجعات',     roles: ['developer','super_admin','admin','cashier'] },
      { href: '/cash',       icon: Wallet,       en: 'Cash Shifts',  ar: 'الورديات',      roles: ['developer','super_admin','admin','cashier'] },
    ],
  },
  {
    groupEn: 'STOCK', groupAr: 'المخزون',
    items: [
      { href: '/products',   icon: Tag,      en: 'Products',    ar: 'المنتجات',      roles: ['developer','super_admin','admin','inventory_manager'] },
      { href: '/inventory',  icon: Package,  en: 'Inventory',   ar: 'المخزون',       roles: ['developer','super_admin','admin','inventory_manager'] },
      { href: '/procurement',icon: Truck,    en: 'Procurement', ar: 'المشتريات',     roles: ['developer','super_admin','admin','inventory_manager','accountant'] },
      { href: '/transfers',  icon: ArrowLeftRight, en: 'Transfers', ar: 'التحويلات', roles: ['developer','super_admin','admin','inventory_manager'] },
    ],
  },
  {
    groupEn: 'OPERATIONS', groupAr: 'العمليات',
    items: [
      { href: '/hr',       icon: Users,     en: 'HR',          ar: 'الموارد البشرية', roles: ['developer','super_admin','admin'] },
      { href: '/finance',  icon: DollarSign,en: 'Finance',     ar: 'المالية',         roles: ['developer','super_admin','admin','accountant'] },
      { href: '/hardware', icon: Cpu,       en: 'Hardware',    ar: 'الأجهزة',         roles: ['developer','super_admin','admin'] },
      { href: '/developer',icon: Code2,     en: 'Developer',   ar: 'المطور',          roles: ['developer'] },
    ],
  },
];

interface SidebarProps {
  role: UserRole;
  userName: string;
  nameAr: string;
  collapsed: boolean;
  onToggle: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  developer:         'bg-purple-500/20 text-purple-400',
  super_admin:       'bg-emerald-500/20 text-emerald-400',
  admin:             'bg-blue-500/20 text-blue-400',
  inventory_manager: 'bg-orange-500/20 text-orange-400',
  cashier:           'bg-cyan-500/20 text-cyan-400',
  accountant:        'bg-yellow-500/20 text-yellow-400',
};

export default function Sidebar({ role, userName, nameAr, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, toggleLang, t } = useLang();
  const { theme, toggleTheme } = useTheme();

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const allowedGroups = NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(item => item.roles.includes(role)),
  })).filter(g => g.items.length > 0);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    sessionStorage.removeItem('saudimart_user');
    router.push('/login');
  }

  return (
    <aside
      style={{ background: 'var(--sidebar-bg)', minHeight: '100vh', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      className={`${collapsed ? 'w-[4.5rem]' : 'w-64'} flex flex-col transition-all duration-300 ease-in-out relative flex-shrink-0`}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 border-b ${collapsed ? 'justify-center px-2' : 'gap-3 px-5'}`}
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center emerald-glow">
          <Store className="w-[18px] h-[18px] text-emerald-400" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight tracking-tight">SaudiMart</p>
            <p className="text-[10px] text-emerald-400/80 font-semibold tracking-widest uppercase">Smart ERP System</p>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="px-3 pt-3">
          <div className="rounded-2xl px-3.5 py-3" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.16), rgba(59,130,246,0.1))', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400/85">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('Workspace Live', 'مساحة العمل نشطة')}</span>
            </div>
            <p className="text-sm font-semibold mt-3 text-white">{t('Unified retail operations', 'تشغيل تجزئة موحد')}</p>
            <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'rgba(226,232,240,0.72)' }}>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('Role-based secure access enabled', 'وصول آمن حسب الدور الوظيفي')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        style={{ background: 'var(--sidebar-bg)', border: '1px solid rgba(255,255,255,0.1)' }}
        className="absolute -right-3.5 top-[4.6rem] w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-white z-20 transition-colors shadow-lg"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2.5 overflow-y-auto space-y-3">
        {allowedGroups.map((group) => (
          <div key={group.groupEn}>
            {!collapsed && (
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] px-3 mb-2" style={{ color: 'rgba(148,163,184,0.55)' }}>
                {t(group.groupEn, group.groupAr)}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-item ${isActive(item.href) ? 'active' : ''} ${collapsed ? 'justify-center !px-0' : ''}`}
                  title={collapsed ? (lang === 'ar' ? item.ar : item.en) : undefined}
                >
                  <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                  {!collapsed && <span className="truncate">{t(item.en, item.ar)}</span>}
                  {!collapsed && isActive(item.href) && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="px-2.5 pb-4 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={`nav-item w-full ${collapsed ? 'justify-center !px-0' : ''}`}
          title={collapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : undefined}
        >
          {theme === 'dark'
            ? <Sun className="w-[18px] h-[18px] flex-shrink-0 text-yellow-400" />
            : <Moon className="w-[18px] h-[18px] flex-shrink-0 text-slate-400" />}
          {!collapsed && (
            <span>{theme === 'dark' ? t('Light Mode', 'الوضع الفاتح') : t('Dark Mode', 'الوضع الداكن')}</span>
          )}
        </button>

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className={`nav-item w-full ${collapsed ? 'justify-center !px-0' : ''}`}
          title={collapsed ? (lang === 'en' ? 'عربي' : 'EN') : undefined}
        >
          <Globe className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>{lang === 'en' ? 'العربية' : 'English'}</span>}
        </button>

        {/* User card */}
        {!collapsed ? (
          <div className="mt-2 px-3 py-3 rounded-2xl flex items-center gap-3"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm text-white emerald-glow"
              style={{ background: 'linear-gradient(135deg, #10b981, #2563eb)' }}>
              {(lang === 'ar' ? nameAr : userName).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {lang === 'ar' ? nameAr : userName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_COLORS[role] || 'bg-slate-500/20 text-slate-400'}`}>
                {role.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.75)' }}>{t('Active', 'نشط')}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mt-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              {(lang === 'ar' ? nameAr : userName).charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`nav-item w-full mt-1 ${collapsed ? 'justify-center !px-0' : ''}`}
          style={{ color: '#f87171' }}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>{t('Logout', 'تسجيل الخروج')}</span>}
        </button>
      </div>
    </aside>
  );
}
