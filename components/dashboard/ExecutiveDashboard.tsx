'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useLang } from '@/contexts/LanguageContext';
import { formatDateTime } from '@/lib/utils';

interface Stats {
  todaySales: number;
  todayVAT: number;
  todayTransactions: number;
  expiringItems: number;
  pendingPOs: number;
  iqamaExpiring: number;
  monthRevenue: number;
  monthTransactions: number;
  activeProducts: number;
  totalCustomers: number;
  activePromos: number;
}

function IconBadge({ icon, accent, className = '' }: { icon: string; accent: string; className?: string }) {
  return (
    <div
      className={`dashboard-icon-wrap ${className}`.trim()}
      style={{ background: `${accent}18`, border: `1px solid ${accent}2e`, color: accent }}
    >
      <Icon icon={icon} className="w-5 h-5" />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
  highlight,
  delay,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  highlight: string;
  delay: number;
}) {
  return (
    <div className="dashboard-stat-card animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-4">
        <IconBadge icon={icon} accent={accent} />
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
          style={{ background: `${accent}14`, color: accent, border: `1px solid ${accent}22` }}
        >
          {highlight}
        </span>
      </div>
      <div className="space-y-1.5">
        <p className="text-[1.65rem] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{value}</p>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        {sub ? <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>{sub}</p> : null}
      </div>
      <div className="h-1 rounded-full" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}10)` }} />
    </div>
  );
}

function MetricBars({ items }: { items: { label: string; value: number; display: string; accent: string }[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.label} className="space-y-2 animate-slide-up" style={{ animationDelay: `${index * 70}ms` }}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.display}</span>
          </div>
          <div className="progress-track dashboard-progress-track">
            <div
              className="progress-fill transition-all duration-700"
              style={{ width: `${Math.max(8, (item.value / max) * 100)}%`, background: `linear-gradient(90deg, ${item.accent}, ${item.accent}80)` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreRing({ value, total, label }: { value: number; total: number; label: string }) {
  const safeTotal = Math.max(total, 1);
  const ratio = Math.min(value / safeTotal, 1);
  const circumference = 2 * Math.PI * 34;
  const offset = circumference * (1 - ratio);

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative w-28 h-28 dashboard-ring-shell">
        <svg viewBox="0 0 96 96" className="w-28 h-28 -rotate-90">
          <circle cx="48" cy="48" r="34" fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth="10" />
          <circle cx="48" cy="48" r="34" fill="none" stroke="#10b981" strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{Math.round(ratio * 100)}%</span>
          <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{label}</span>
        </div>
      </div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const { t } = useLang();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/stats?ts=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const todaySales = stats?.todaySales || 0;
  const todayVAT = stats?.todayVAT || 0;
  const todayTransactions = stats?.todayTransactions || 0;
  const monthRevenue = stats?.monthRevenue || 0;
  const monthTransactions = stats?.monthTransactions || 0;
  const activeProducts = stats?.activeProducts || 0;
  const totalCustomers = stats?.totalCustomers || 0;
  const activePromos = stats?.activePromos || 0;
  const expiringItems = stats?.expiringItems || 0;
  const pendingPOs = stats?.pendingPOs || 0;
  const iqamaExpiring = stats?.iqamaExpiring || 0;
  const monthAverage = monthRevenue / Math.max(new Date().getDate(), 1);
  const avgBasket = todayTransactions > 0 ? todaySales / todayTransactions : 0;
  const highestAttention = Math.max(expiringItems, pendingPOs, iqamaExpiring, activePromos, 1);
  const positives = todayTransactions + activeProducts + totalCustomers + activePromos;
  const risk = expiringItems + pendingPOs + iqamaExpiring;
  const workspaceScore = { value: Math.max(0, positives - risk), total: Math.max(positives, 1) };

  const revenueBars = [
    { label: t('Today Sales', 'مبيعات اليوم'), value: todaySales, display: `SAR ${todaySales.toFixed(2)}`, accent: '#10b981' },
    { label: t('Daily Month Avg', 'متوسط الشهر اليومي'), value: monthAverage, display: `SAR ${monthAverage.toFixed(2)}`, accent: '#3b82f6' },
    { label: t('Average Basket', 'متوسط السلة'), value: avgBasket, display: `SAR ${avgBasket.toFixed(2)}`, accent: '#a855f7' },
    { label: t('VAT Collected', 'الضريبة المحصلة'), value: todayVAT, display: `SAR ${todayVAT.toFixed(2)}`, accent: '#f59e0b' },
  ];

  const attentionItems = [
    { icon: 'solar:box-minimalistic-broken', label: t('Stock expiring soon', 'مخزون ينتهي قريباً'), value: expiringItems, accent: '#f59e0b', hint: t('Review FEFO and markdown opportunities', 'راجع FEFO وفرص التخفيض') },
    { icon: 'solar:delivery-bold-duotone', label: t('Pending procurement', 'مشتريات معلقة'), value: pendingPOs, accent: '#fb7185', hint: t('Follow supplier commitments and receiving', 'تابع التوريد والاستلام') },
    { icon: 'solar:user-warning-bold-duotone', label: t('Iqama renewals', 'تجديد الإقامات'), value: iqamaExpiring, accent: '#ef4444', hint: t('Avoid compliance delays', 'تجنب التأخير في الامتثال') },
    { icon: 'solar:ticket-sale-bold-duotone', label: t('Active promotions', 'عروض نشطة'), value: activePromos, accent: '#06b6d4', hint: t('Track campaign uplift across POS', 'راقب أثر الحملات في نقطة البيع') },
  ].map((item) => ({ ...item, width: `${Math.max(10, (item.value / highestAttention) * 100)}%` }));

  const headlineTiles = [
    {
      icon: 'solar:wallet-money-bold-duotone',
      label: t('Revenue today', 'إيراد اليوم'),
      value: `SAR ${todaySales.toFixed(2)}`,
      note: t('Frontline trade is active', 'التشغيل البيعي نشط'),
      accent: '#10b981',
    },
    {
      icon: 'solar:users-group-rounded-bold-duotone',
      label: t('Customers tracked', 'العملاء المتابعون'),
      value: String(totalCustomers),
      note: t('CRM growth visibility', 'وضوح نمو إدارة العملاء'),
      accent: '#3b82f6',
    },
    {
      icon: 'solar:box-bold-duotone',
      label: t('Products live', 'منتجات نشطة'),
      value: String(activeProducts),
      note: t('Catalog ready for execution', 'الكتالوج جاهز للتنفيذ'),
      accent: '#a855f7',
    },
  ];

  const statCards = [
    {
      icon: 'solar:banknote-2-bold-duotone',
      label: t("Today's Sales", 'مبيعات اليوم'),
      value: `SAR ${todaySales.toFixed(2)}`,
      sub: t(`${todayTransactions} transactions`, `${todayTransactions} معاملة`),
      accent: '#10b981',
      highlight: t('Live', 'مباشر'),
    },
    {
      icon: 'solar:graph-up-bold-duotone',
      label: t('Month Revenue', 'إيرادات الشهر'),
      value: `SAR ${monthRevenue.toFixed(2)}`,
      sub: t(`${monthTransactions} invoices`, `${monthTransactions} فاتورة`),
      accent: '#3b82f6',
      highlight: t('Growth', 'نمو'),
    },
    {
      icon: 'solar:calculator-bold-duotone',
      label: t("Today's VAT", 'ضريبة القيمة المضافة'),
      value: `SAR ${todayVAT.toFixed(2)}`,
      sub: t('15% VAT collected', 'ضريبة 15% محصلة'),
      accent: '#a855f7',
      highlight: t('Tax', 'ضريبة'),
    },
    {
      icon: 'solar:cart-large-4-bold-duotone',
      label: t('Transactions Today', 'معاملات اليوم'),
      value: todayTransactions,
      sub: t('POS activity across the day', 'نشاط نقطة البيع خلال اليوم'),
      accent: '#06b6d4',
      highlight: t('POS', 'البيع'),
    },
    {
      icon: 'solar:danger-triangle-bold-duotone',
      label: t('Expiring Items (30d)', 'منتجات تنتهي صلاحيتها'),
      value: expiringItems,
      sub: t('Require attention', 'تتطلب مراجعة'),
      accent: '#eab308',
      highlight: t('Risk', 'مخاطر'),
    },
    {
      icon: 'solar:truck-bold-duotone',
      label: t('Pending POs', 'أوامر الشراء المعلقة'),
      value: pendingPOs,
      sub: t('Supplier follow-up required', 'تحتاج متابعة المورد'),
      accent: '#f97316',
      highlight: t('Supply', 'توريد'),
    },
    {
      icon: 'solar:user-id-bold-duotone',
      label: t('Iqama Expiring (60d)', 'إقامات تنتهي قريباً'),
      value: iqamaExpiring,
      sub: t('Compliance queue', 'قائمة الامتثال'),
      accent: '#ef4444',
      highlight: t('HR', 'الموارد'),
    },
    {
      icon: 'solar:archive-bold-duotone',
      label: t('Active Products', 'المنتجات النشطة'),
      value: stats?.activeProducts ?? '—',
      sub: t(`${totalCustomers} customers`, `${totalCustomers} عميل`),
      accent: '#64748b',
      highlight: t('Catalog', 'الكتالوج'),
    },
  ];

  const quickActions = [
    { href: '/pos', icon: 'solar:cart-large-4-bold-duotone', en: 'New Sale', ar: 'بيع جديد', accent: '#10b981', descEn: 'Fast billing and receipt capture', descAr: 'فواتير سريعة وطباعة الإيصال' },
    { href: '/customers', icon: 'solar:users-group-rounded-bold-duotone', en: 'Customers', ar: 'العملاء', accent: '#3b82f6', descEn: 'Review CRM and loyalty activity', descAr: 'راجع العملاء والولاء' },
    { href: '/returns', icon: 'solar:undo-left-round-bold-duotone', en: 'Returns', ar: 'المرتجعات', accent: '#ef4444', descEn: 'Process controlled refund flows', descAr: 'إدارة المرتجعات باحتراف' },
    { href: '/cash', icon: 'solar:wallet-money-bold-duotone', en: 'Cash Shifts', ar: 'الورديات', accent: '#f97316', descEn: 'Open, track, and close shifts', descAr: 'افتح وأغلق الورديات' },
    { href: '/products', icon: 'solar:tag-price-bold-duotone', en: 'Products', ar: 'المنتجات', accent: '#a855f7', descEn: 'Maintain pricing and catalog', descAr: 'إدارة المنتجات والتسعير' },
    { href: '/inventory', icon: 'solar:box-bold-duotone', en: 'Inventory', ar: 'المخزون', accent: '#06b6d4', descEn: 'Track batches and FEFO risk', descAr: 'تابع الدفعات وصلاحيتها' },
    { href: '/procurement', icon: 'solar:delivery-bold-duotone', en: 'Procurement', ar: 'المشتريات', accent: '#fbbf24', descEn: 'Control POs, GRNs, and payables', descAr: 'تحكم في أوامر الشراء والاستلام والفواتير' },
    { href: '/reports', icon: 'solar:chart-square-bold-duotone', en: 'Reports', ar: 'التقارير', accent: '#64748b', descEn: 'Explore operational analytics', descAr: 'استكشف التحليلات التشغيلية' },
  ];

  return (
    <div className="space-y-6 animate-fade-in dashboard-shell">
      <div className="hero-panel dashboard-hero-card relative overflow-hidden p-6 lg:p-7">
        <div className="dashboard-orb dashboard-orb-emerald" />
        <div className="dashboard-orb dashboard-orb-blue" />
        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold dashboard-status-chip">
                <Icon icon="solar:stars-line-duotone" className="w-4 h-4" />
                <span>{t('Executive overview', 'نظرة تنفيذية')}</span>
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl" style={{ color: 'var(--text-primary)' }}>
                {t('Smart Retail Command Center', 'مركز القيادة الذكي للتجزئة')}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                {t('Monitor sales, compliance, stock health, and customer growth from one professional operating dashboard.', 'راقب المبيعات والامتثال وصحة المخزون ونمو العملاء من لوحة تشغيل احترافية واحدة.')}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="badge badge-emerald"><Icon icon="solar:shield-check-line-duotone" className="mr-1 h-3.5 w-3.5" />{t('Operations healthy', 'العمليات مستقرة')}</span>
                <span className="badge badge-blue"><Icon icon="solar:pulse-2-line-duotone" className="mr-1 h-3.5 w-3.5" />{t('Live business snapshot', 'لقطة أعمال مباشرة')}</span>
                <span>{t('Last updated:', 'آخر تحديث:')} {formatDateTime(lastUpdated)}</span>
              </div>
            </div>
            <button onClick={() => void fetchStats()} disabled={loading} className="btn-secondary dashboard-refresh-button flex items-center gap-2 self-start lg:self-auto">
              <Icon icon={loading ? 'svg-spinners:90-ring-with-bg' : 'solar:refresh-line-duotone'} className="h-4 w-4" />
              {t('Refresh', 'تحديث')}
            </button>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr] items-start">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {headlineTiles.map((item, index) => (
                  <div key={item.label} className="dashboard-mini-tile animate-slide-up" style={{ animationDelay: `${index * 70}ms` }}>
                    <div className="flex items-start justify-between gap-3">
                      <IconBadge icon={item.icon} accent={item.accent} className="h-11 w-11" />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: item.accent }}>{item.label}</span>
                    </div>
                    <div className="mt-5 space-y-1.5">
                      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
                      <p className="text-sm" style={{ color: item.accent }}>{item.note}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="dashboard-subtle-grid rounded-3xl p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="dashboard-pulse-card">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{t('Sales velocity', 'سرعة المبيعات')}</p>
                      <Icon icon="solar:chart-2-bold-duotone" className="h-5 w-5" style={{ color: '#10b981' }} />
                    </div>
                    <p className="mt-3 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.todayTransactions || 0}</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{t('Transactions processed today', 'معاملات تمت اليوم')}</p>
                  </div>
                  <div className="dashboard-pulse-card">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{t('Customer reach', 'وصول العملاء')}</p>
                      <Icon icon="solar:users-group-rounded-bold-duotone" className="h-5 w-5" style={{ color: '#3b82f6' }} />
                    </div>
                    <p className="mt-3 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.totalCustomers || 0}</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{t('Tracked CRM profiles', 'ملفات عملاء المتابعة')}</p>
                  </div>
                  <div className="dashboard-pulse-card">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{t('Campaign live', 'الحملات النشطة')}</p>
                      <Icon icon="solar:ticket-sale-bold-duotone" className="h-5 w-5" style={{ color: '#a855f7' }} />
                    </div>
                    <p className="mt-3 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.activePromos || 0}</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{t('Promotions visible across POS', 'عروض ظاهرة عبر نقطة البيع')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="chart-shell chart-grid dashboard-analytics-card p-5 lg:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('Revenue Momentum', 'زخم الإيرادات')}</p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{t('Daily financial pulse across sales KPIs', 'النبض المالي اليومي عبر مؤشرات المبيعات')}</p>
                </div>
                <IconBadge icon="solar:chart-square-bold-duotone" accent="#10b981" />
              </div>
              <MetricBars items={revenueBars} />
            </div>
          </div>
        </div>
      </div>

      {loading && !stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="dashboard-stat-card h-40 animate-pulse" style={{ opacity: 0.6 }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card, index) => (
            <StatCard key={card.label} {...card} delay={index * 60} />
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="surface-panel dashboard-panel-lift p-5 lg:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{t('Operational Attention Areas', 'مناطق الانتباه التشغيلية')}</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{t('Priority signals that need fast action from operations teams.', 'إشارات أولوية تتطلب تدخلاً سريعاً من فرق التشغيل.')}</p>
            </div>
            <IconBadge icon="solar:danger-triangle-bold-duotone" accent="#f59e0b" />
          </div>
          <div className="space-y-4">
            {attentionItems.map((item, index) => (
              <div key={item.label} className="dashboard-attention-item animate-slide-up" style={{ animationDelay: `${index * 60}ms` }}>
                <div className="flex items-start gap-4">
                  <IconBadge icon={item.icon} accent={item.accent} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                        <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-muted)' }}>{item.hint}</p>
                      </div>
                      <span className="text-lg font-bold" style={{ color: item.accent }}>{item.value}</span>
                    </div>
                    <div className="mt-3 progress-track dashboard-progress-track">
                      <div className="progress-fill" style={{ width: item.width, background: `linear-gradient(90deg, ${item.accent}, ${item.accent}70)` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-panel dashboard-panel-lift p-5 lg:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{t('Workspace Readiness', 'جاهزية مساحة العمل')}</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{t('A quick smart-read of business activity versus operational risk.', 'قراءة ذكية سريعة لنشاط الأعمال مقابل المخاطر التشغيلية.')}</p>
            </div>
            <IconBadge icon="solar:layers-bold-duotone" accent="#3b82f6" />
          </div>
          <div className="grid items-center gap-5 sm:grid-cols-[0.9fr_1.1fr]">
            <ScoreRing value={workspaceScore.value} total={workspaceScore.total} label={t('Ready', 'جاهز')} />
            <div className="space-y-3">
              <div className="dashboard-mini-tile">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{t('Month revenue', 'إيراد الشهر')}</p>
                  <Icon icon="solar:graph-up-bold-duotone" className="h-5 w-5" style={{ color: '#10b981' }} />
                </div>
                <p className="mt-3 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>SAR {(stats?.monthRevenue || 0).toFixed(2)}</p>
              </div>
              <div className="dashboard-mini-tile">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{t('Monthly transactions', 'معاملات الشهر')}</p>
                  <Icon icon="solar:cart-large-4-bold-duotone" className="h-5 w-5" style={{ color: '#3b82f6' }} />
                </div>
                <p className="mt-3 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.monthTransactions || 0}</p>
              </div>
              <div className="dashboard-mini-tile">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{t('Promotions live', 'العروض النشطة')}</p>
                  <Icon icon="solar:ticket-sale-bold-duotone" className="h-5 w-5" style={{ color: '#a855f7' }} />
                </div>
                <p className="mt-3 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.activePromos || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="surface-panel dashboard-panel-lift p-5 lg:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>
            {t('QUICK ACTIONS', 'الإجراءات السريعة')}
          </h2>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('Move faster across the most used workflows', 'انتقل بسرعة عبر أكثر المسارات استخداماً')}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action, index) => (
            <Link
              key={action.href}
              href={action.href}
              className="dashboard-action-card group animate-slide-up"
              style={{ animationDelay: `${index * 55}ms`, borderColor: `${action.accent}22` }}
            >
              <div className="flex items-start justify-between gap-3">
                <IconBadge icon={action.icon} accent={action.accent} className="h-12 w-12" />
                <Icon icon="solar:alt-arrow-right-line-duotone" className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" style={{ color: 'var(--text-muted)' }} />
              </div>
              <div className="mt-5">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t(action.en, action.ar)}</p>
                <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-muted)' }}>{t(action.descEn, action.descAr)}</p>
              </div>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: action.accent }}>{t('Open workflow', 'فتح المسار')}</span>
                <span className="h-1.5 w-16 rounded-full" style={{ background: `linear-gradient(90deg, ${action.accent}, transparent)` }} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
        {t('Press Ctrl+K to open Command Palette', 'اضغط Ctrl+K لفتح لوحة الأوامر')}
      </p>
    </div>
  );
}
