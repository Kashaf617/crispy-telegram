'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, LayoutDashboard, ShoppingCart, Package, Truck, Users, DollarSign, Code2, X, RotateCcw, Wallet, UserCircle, BarChart2, Sparkles } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';
import type { UserRole } from '@/types';

const COMMANDS = [
  { id: 'dashboard',   href: '/',            icon: LayoutDashboard, en: 'Dashboard',   ar: 'لوحة التحكم',    descEn: 'Executive overview and command center', descAr: 'نظرة تنفيذية ومركز قيادة', roles: ['developer','super_admin','admin','inventory_manager','cashier','accountant'] },
  { id: 'reports',     href: '/reports',     icon: BarChart2,      en: 'Reports',     ar: 'التقارير',       descEn: 'Analytics and export-ready business insights', descAr: 'تحليلات وتقارير جاهزة للتصدير', roles: ['developer','super_admin','admin','accountant'] },
  { id: 'pos',         href: '/pos',         icon: ShoppingCart,   en: 'POS Billing', ar: 'نقطة البيع',     descEn: 'Fast checkout and receipt workflow', descAr: 'الدفع السريع وطباعة الإيصال', roles: ['developer','super_admin','admin','cashier'] },
  { id: 'customers',   href: '/customers',   icon: UserCircle,     en: 'Customers',   ar: 'العملاء',        descEn: 'CRM, loyalty, and customer records', descAr: 'إدارة العملاء والولاء', roles: ['developer','super_admin','admin','cashier'] },
  { id: 'returns',     href: '/returns',     icon: RotateCcw,      en: 'Returns',     ar: 'المرتجعات',      descEn: 'Process controlled return flows', descAr: 'إدارة المرتجعات باحتراف', roles: ['developer','super_admin','admin','cashier'] },
  { id: 'cash',        href: '/cash',        icon: Wallet,         en: 'Cash Shifts', ar: 'الورديات',       descEn: 'Track cashier sessions and balances', descAr: 'تتبع الورديات والأرصدة', roles: ['developer','super_admin','admin','cashier'] },
  { id: 'inventory',   href: '/inventory',   icon: Package,        en: 'Inventory',   ar: 'المخزون',        descEn: 'Batches, expiry, and FEFO controls', descAr: 'الدفعات والصلاحية وFEFO', roles: ['developer','super_admin','admin','inventory_manager'] },
  { id: 'procurement', href: '/procurement', icon: Truck,          en: 'Procurement', ar: 'المشتريات',      descEn: 'POs, GRNs, supplier bills, and payables', descAr: 'أوامر شراء واستلام وفواتير موردين', roles: ['developer','super_admin','admin','inventory_manager','accountant'] },
  { id: 'hr',          href: '/hr',          icon: Users,          en: 'HR',          ar: 'الموارد البشرية', descEn: 'Employees, payroll, and iqama tracking', descAr: 'الموظفون والرواتب والإقامات', roles: ['developer','super_admin','admin'] },
  { id: 'finance',     href: '/finance',     icon: DollarSign,     en: 'Finance',     ar: 'المالية',        descEn: 'VAT, invoices, and compliance review', descAr: 'الضريبة والفواتير والامتثال', roles: ['developer','super_admin','admin','accountant'] },
  { id: 'developer',   href: '/developer',   icon: Code2,          en: 'Developer',   ar: 'المطور',         descEn: 'Technical diagnostics and audit controls', descAr: 'أدوات تقنية وسجلات تدقيق', roles: ['developer'] },
];

interface CommandPaletteProps {
  onClose: () => void;
  userRole: UserRole;
}

export default function CommandPalette({ onClose, userRole }: CommandPaletteProps) {
  const router = useRouter();
  const { t } = useLang();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = COMMANDS.filter(
    (c) =>
      c.roles.includes(userRole) &&
      (c.en.toLowerCase().includes(query.toLowerCase()) || c.ar.includes(query))
  );

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setSelected(0); }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') setSelected((s) => Math.min(s + 1, filtered.length - 1));
      if (e.key === 'ArrowUp') setSelected((s) => Math.max(s - 1, 0));
      if (e.key === 'Enter' && filtered[selected]) {
        router.push(filtered[selected].href);
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, selected, router, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg glass-card-dark border border-white/15 rounded-2xl overflow-hidden shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-emerald-400/80">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('Smart Navigation', 'تنقل ذكي')}</span>
            </div>
            <button onClick={onClose} className="text-slate-600 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Search commands…', 'البحث في الأوامر…')}
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm outline-none"
          />
          </div>
        </div>

        {/* Results */}
        <div className="py-2 max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-600 text-sm py-8">{t('No results', 'لا توجد نتائج')}</p>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => { router.push(cmd.href); onClose(); }}
                className={`w-full flex items-start gap-3 px-4 py-3 text-sm transition-colors ${
                  i === selected ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: i === selected ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.05)' }}>
                  <cmd.icon className="w-4 h-4 flex-shrink-0" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="font-semibold">{t(cmd.en, cmd.ar)}</p>
                  <p className={`text-xs mt-1 ${i === selected ? 'text-emerald-300/80' : 'text-slate-500'}`}>{t(cmd.descEn, cmd.descAr)}</p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/8 flex items-center gap-4 text-xs text-slate-600">
          <span>↑↓ {t('navigate', 'تنقل')}</span>
          <span>↵ {t('select', 'اختر')}</span>
          <span>Esc {t('close', 'أغلق')}</span>
        </div>
      </div>
    </div>
  );
}
