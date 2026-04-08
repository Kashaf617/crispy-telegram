'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart2, TrendingUp, Package, Users, Download,
  RefreshCw, DollarSign, ShoppingCart, AlertTriangle, Activity, Sparkles,
} from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/utils';

type ReportType = 'sales' | 'stock' | 'hr';

interface DailyRow { date: string; sales: number; vat: number; transactions: number; returns: number; }
interface TopProduct { name: string; qty: number; revenue: number; }

interface SalesReport {
  daily: DailyRow[];
  totalSales: number; totalVAT: number; totalTx: number; totalReturn: number;
  topProducts: TopProduct[];
}
interface StockReport {
  batches: { _id: string; productId: { name: string; sku: string; category: string } | string; remainingQty: number; status: string; expiryDate: string }[];
  totalWastageCost: number; lowStock: number; expired: number; wastageCount: number;
}
interface HRReport {
  employeeCount: number; totalPayroll: number; expiring60: number;
  employees: { _id: string; name: string; position: string; salary: number; iqamaExpiry?: string }[];
}

function TrendChart({ rows }: { rows: DailyRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
        No chart data available
      </div>
    );
  }

  const maxSales = Math.max(...rows.map((row) => row.sales), 1);
  const maxVat = Math.max(...rows.map((row) => row.vat), 1);
  const points = rows.map((row, index) => {
    const x = (index / Math.max(rows.length - 1, 1)) * 100;
    const y = 100 - (row.sales / maxSales) * 82;
    return `${x},${y}`;
  }).join(' ');
  const vatPoints = rows.map((row, index) => {
    const x = (index / Math.max(rows.length - 1, 1)) * 100;
    const y = 100 - (row.vat / maxVat) * 74;
    return `${x},${y}`;
  }).join(' ');
  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <div className="chart-shell chart-grid p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Sales Trend</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Revenue and VAT movement across the selected period</p>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#10b981' }} />Sales</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#a855f7' }} />VAT</span>
        </div>
      </div>
      <svg viewBox="0 0 100 100" className="w-full h-64 overflow-visible">
        <defs>
          <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#salesArea)" />
        <polyline fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={points} />
        <polyline fill="none" stroke="#a855f7" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4 4" points={vatPoints} />
      </svg>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {rows.slice(-4).map((row) => (
          <div key={row.date} className="metric-tile py-3">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.date}</p>
            <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>SAR {row.sales.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankedBars({ items }: { items: { label: string; value: number; secondary?: string; accent: string }[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
              {item.secondary && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.secondary}</p>}
            </div>
            <span className="text-sm font-semibold" style={{ color: item.accent }}>{item.value}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.max(10, (item.value / max) * 100)}%`, background: `linear-gradient(90deg, ${item.accent}, ${item.accent}80)` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useLang();
  const [type, setType] = useState<ReportType>('sales');
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData]     = useState<SalesReport | null>(null);
  const [stockData, setStockData]     = useState<StockReport | null>(null);
  const [hrData, setHRData]           = useState<HRReport | null>(null);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [to, setTo]     = useState(() => new Date().toISOString().split('T')[0]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports?type=${type}&from=${from}&to=${to}`);
    if (res.ok) {
      const d = await res.json();
      if (type === 'sales') setSalesData(d);
      if (type === 'stock') setStockData(d);
      if (type === 'hr')    setHRData(d);
    }
    setLoading(false);
  }, [type, from, to]);

  useEffect(() => { void fetchReport(); }, [fetchReport]);

  function exportCSV() {
    let rows: string[][] = [];
    if (type === 'sales' && salesData) {
      rows = [['Date','Sales (SAR)','VAT (SAR)','Transactions','Returns (SAR)'],
        ...salesData.daily.map(r => [r.date, r.sales.toFixed(2), r.vat.toFixed(2), String(r.transactions), r.returns.toFixed(2)])];
    } else if (type === 'stock' && stockData) {
      rows = [['Product','SKU','Category','Remaining','Status','Expiry'],
        ...stockData.batches.map(b => {
          const p = typeof b.productId === 'object' ? b.productId : { name:'—', sku:'—', category:'—' };
          return [p.name, p.sku, p.category, String(b.remainingQty), b.status, formatDate(b.expiryDate)];
        })];
    } else if (type === 'hr' && hrData) {
      rows = [['Name','Position','Salary (SAR)','Iqama Expiry'],
        ...hrData.employees.map(e => [e.name, e.position, e.salary.toFixed(2), e.iqamaExpiry ? formatDate(e.iqamaExpiry) : '—'])];
    }
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `report-${type}-${from}-${to}.csv`;
    a.click();
  }

  const TAB_BTNS: { key: ReportType; label: string; labelAr: string; icon: React.ElementType; accent: string }[] = [
    { key: 'sales', label: 'Sales Report',  labelAr: 'تقرير المبيعات',   icon: BarChart2, accent: '#10b981' },
    { key: 'stock', label: 'Stock Report',  labelAr: 'تقرير المخزون',   icon: Package,   accent: '#3b82f6' },
    { key: 'hr',    label: 'HR Report',     labelAr: 'تقرير الموارد',   icon: Users,     accent: '#a855f7' },
  ];

  const salesTopBars = useMemo(() => (salesData?.topProducts || []).slice(0, 5).map((item) => ({
    label: item.name,
    value: item.qty,
    secondary: `SAR ${item.revenue.toFixed(2)}`,
    accent: '#10b981',
  })), [salesData]);

  const stockStatusBars = useMemo(() => {
    if (!stockData) return [];
    return [
      { label: t('Low stock batches', 'دفعات منخفضة'), value: stockData.lowStock, secondary: t('Needs replenishment planning', 'تحتاج تخطيط إعادة الطلب'), accent: '#f97316' },
      { label: t('Expired batches', 'دفعات منتهية'), value: stockData.expired, secondary: t('Remove from sellable stock', 'إزالتها من المخزون القابل للبيع'), accent: '#ef4444' },
      { label: t('Wastage events', 'حالات هدر'), value: stockData.wastageCount, secondary: `SAR ${stockData.totalWastageCost.toFixed(2)}`, accent: '#a855f7' },
    ];
  }, [stockData, t]);

  const hrSalaryBars = useMemo(() => (hrData?.employees || []).slice().sort((a, b) => b.salary - a.salary).slice(0, 5).map((item) => ({
    label: item.name,
    value: item.salary,
    secondary: item.position,
    accent: '#a855f7',
  })), [hrData]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.18)' }}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('Analytics workspace', 'مساحة التحليلات')}</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('Reports & Analytics', 'التقارير والتحليلات')}</h1>
          <p className="text-sm mt-1 max-w-3xl" style={{ color: 'var(--text-muted)' }}>{t('Professional KPI reporting for sales, stock, and HR with actionable visuals and export-ready data.', 'تقارير احترافية للمبيعات والمخزون والموارد البشرية مع مرئيات قابلة للتنفيذ وبيانات جاهزة للتصدير.')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchReport} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />{t('Export CSV', 'تصدير CSV')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="hero-panel p-5 lg:p-6 space-y-5">
        <div className="flex gap-2 flex-wrap">
        {TAB_BTNS.map(tb => (
          <button key={tb.key} onClick={() => setType(tb.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: type === tb.key ? tb.accent + '20' : 'var(--bg-muted)',
              border: `1px solid ${type === tb.key ? tb.accent + '50' : 'var(--border-color)'}`,
              color: type === tb.key ? tb.accent : 'var(--text-secondary)',
            }}>
            <tb.icon className="w-4 h-4" />
            {t(tb.label, tb.labelAr)}
          </button>
        ))}
        </div>

      {/* Date filter */}
        <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('From','من')}</label>
          <input type="date" className="input-field" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('To','إلى')}</label>
          <input type="date" className="input-field" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button onClick={fetchReport} className="btn-primary">{t('Apply','تطبيق')}</button>
        <div className="ml-auto metric-tile py-3 px-4 min-w-[220px]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>{t('Current focus', 'التركيز الحالي')}</p>
          <p className="text-sm font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>{t(TAB_BTNS.find((tab) => tab.key === type)?.label || 'Sales Report', TAB_BTNS.find((tab) => tab.key === type)?.labelAr || 'تقرير المبيعات')}</p>
        </div>
        </div>
      </div>

      {loading && (
        <div className="card p-12 text-center">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin" style={{ color: '#10b981' }} />
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>{t('Generating report…','جاري إنشاء التقرير…')}</p>
        </div>
      )}

      {/* ── SALES ── */}
      {!loading && type === 'sales' && salesData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: DollarSign,   label: t('Total Sales','إجمالي المبيعات'),      value: `SAR ${salesData.totalSales.toFixed(2)}`,   accent: '#10b981' },
              { icon: TrendingUp,   label: t('Total VAT (15%)','إجمالي الضريبة'),   value: `SAR ${salesData.totalVAT.toFixed(2)}`,     accent: '#a855f7' },
              { icon: ShoppingCart, label: t('Transactions','المعاملات'),           value: salesData.totalTx,                          accent: '#3b82f6' },
              { icon: AlertTriangle,label: t('Total Returns','إجمالي المرتجعات'),   value: `SAR ${salesData.totalReturn.toFixed(2)}`,  accent: '#ef4444' },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div className="p-2.5 rounded-xl w-fit" style={{ background: s.accent + '18', border: `1px solid ${s.accent}30` }}>
                  <s.icon className="w-5 h-5" style={{ color: s.accent }} />
                </div>
                <div>
                  <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <TrendChart rows={salesData.daily} />

          {salesTopBars.length > 0 && (
            <div className="surface-panel p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{t('Top Product Velocity', 'أداء المنتجات الأعلى')}</h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{t('Best-selling products ranked by units sold.', 'أفضل المنتجات مبيعاً حسب عدد الوحدات.')}</p>
                </div>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.18)' }}>
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <RankedBars items={salesTopBars} />
            </div>
          )}

          {/* Daily sales table */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('Daily Breakdown','التفصيل اليومي')}</h3>
            </div>
            <table className="w-full">
              <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
                <tr>
                  {[t('Date','التاريخ'), t('Sales','المبيعات'), t('VAT','الضريبة'), t('Transactions','المعاملات'), t('Returns','المرتجعات')].map(h => (
                    <th key={h} className="table-header text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salesData.daily.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>{t('No data in range','لا توجد بيانات في الفترة المحددة')}</td></tr>
                ) : salesData.daily.map(row => (
                  <tr key={row.date} className="table-row">
                    <td className="table-cell font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>{row.date}</td>
                    <td className="table-cell font-semibold" style={{ color: '#10b981' }}>SAR {row.sales.toFixed(2)}</td>
                    <td className="table-cell" style={{ color: '#a855f7' }}>SAR {row.vat.toFixed(2)}</td>
                    <td className="table-cell text-center" style={{ color: 'var(--text-primary)' }}>{row.transactions}</td>
                    <td className="table-cell" style={{ color: row.returns > 0 ? '#ef4444' : 'var(--text-muted)' }}>SAR {row.returns.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top products */}
          {salesData.topProducts.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('Top 10 Products','أفضل 10 منتجات')}</h3>
              </div>
              <table className="w-full">
                <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <tr>
                    <th className="table-header text-left">{t('Product','المنتج')}</th>
                    <th className="table-header text-right">{t('Qty Sold','الكمية المباعة')}</th>
                    <th className="table-header text-right">{t('Revenue','الإيراد')}</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.topProducts.map((p, i) => (
                    <tr key={p.name} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: i < 3 ? '#fbbf2420' : 'var(--bg-muted)', color: i < 3 ? '#fbbf24' : 'var(--text-muted)' }}>
                            {i + 1}
                          </span>
                          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                        </div>
                      </td>
                      <td className="table-cell text-right text-sm" style={{ color: 'var(--text-secondary)' }}>{p.qty}</td>
                      <td className="table-cell text-right font-semibold" style={{ color: '#10b981' }}>SAR {p.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── STOCK ── */}
      {!loading && type === 'stock' && stockData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: t('Total Batches','إجمالي الدفعات'),         value: stockData.batches.length,                       accent: '#3b82f6' },
              { label: t('Low Stock Batches','دفعات منخفضة'),        value: stockData.lowStock,                             accent: '#f97316' },
              { label: t('Expired Batches','دفعات منتهية'),          value: stockData.expired,                              accent: '#ef4444' },
              { label: t('Wastage Cost (period)','تكلفة الهدر'),     value: `SAR ${stockData.totalWastageCost.toFixed(2)}`, accent: '#a855f7' },
            ].map((s, i) => (
              <div key={i} className="card px-4 py-3">
                <p className="text-xl font-bold" style={{ color: s.accent }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
              </div>
            ))}
          </div>
          {stockStatusBars.length > 0 && (
            <div className="surface-panel p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{t('Inventory Risk Signals', 'إشارات مخاطر المخزون')}</h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{t('A quick visual view of stock pressure, expiry, and wastage.', 'عرض بصري سريع لضغط المخزون والانتهاء والهدر.')}</p>
                </div>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.18)' }}>
                  <Activity className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <RankedBars items={stockStatusBars} />
            </div>
          )}
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
                <tr>
                  {[t('Product','المنتج'), t('SKU','الرمز'), t('Category','الفئة'), t('Remaining','المتبقي'), t('Status','الحالة'), t('Expiry','الانتهاء')].map(h => (
                    <th key={h} className="table-header text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stockData.batches.slice(0, 50).map(b => {
                  const p = typeof b.productId === 'object' ? b.productId : { name: '—', sku: '—', category: '—' };
                  return (
                    <tr key={b._id} className="table-row">
                      <td className="table-cell font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                      <td className="table-cell text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{p.sku}</td>
                      <td className="table-cell text-sm" style={{ color: 'var(--text-secondary)' }}>{p.category}</td>
                      <td className="table-cell font-semibold" style={{ color: 'var(--text-primary)' }}>{b.remainingQty}</td>
                      <td className="table-cell">
                        <span className={`badge ${b.status === 'active' ? 'badge-emerald' : b.status === 'expired' ? 'badge-red' : 'badge-slate'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="table-cell text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(b.expiryDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── HR ── */}
      {!loading && type === 'hr' && hrData && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: t('Total Employees','إجمالي الموظفين'),       value: hrData.employeeCount,                   accent: '#3b82f6' },
              { label: t('Monthly Payroll','الرواتب الشهرية'),       value: `SAR ${hrData.totalPayroll.toFixed(0)}`, accent: '#10b981' },
              { label: t('Iqama Expiring 60d','إقامات تنتهي 60 يوم'), value: hrData.expiring60,                      accent: '#ef4444' },
            ].map((s, i) => (
              <div key={i} className="card px-4 py-3 text-center">
                <p className="text-2xl font-bold" style={{ color: s.accent }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
              </div>
            ))}
          </div>
          {hrSalaryBars.length > 0 && (
            <div className="surface-panel p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{t('Compensation Snapshot', 'لقطة الرواتب')}</h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{t('Top salary bands by employee for quick HR review.', 'أعلى الرواتب حسب الموظف لمراجعة سريعة من الموارد البشرية.')}</p>
                </div>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.18)' }}>
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
              </div>
              <RankedBars items={hrSalaryBars} />
            </div>
          )}
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
                <tr>
                  {[t('Name','الاسم'), t('Position','المنصب'), t('Salary (SAR)','الراتب'), t('Iqama Expiry','انتهاء الإقامة')].map(h => (
                    <th key={h} className="table-header text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hrData.employees.map(e => {
                  const expiring = e.iqamaExpiry
                    ? Math.ceil((new Date(e.iqamaExpiry).getTime() - Date.now()) / 86400000)
                    : null;
                  return (
                    <tr key={e._id} className="table-row">
                      <td className="table-cell font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{e.name}</td>
                      <td className="table-cell text-sm" style={{ color: 'var(--text-secondary)' }}>{e.position}</td>
                      <td className="table-cell font-semibold" style={{ color: '#10b981' }}>SAR {e.salary.toFixed(2)}</td>
                      <td className="table-cell">
                        {e.iqamaExpiry ? (
                          <span className={`badge ${expiring !== null && expiring < 0 ? 'badge-red' : expiring !== null && expiring <= 60 ? 'badge-yellow' : 'badge-slate'}`}>
                            {formatDate(e.iqamaExpiry)}
                            {expiring !== null && expiring <= 60 && ` (${expiring}d)`}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
