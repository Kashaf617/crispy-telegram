'use client';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { IInvoice } from '@/types';

interface ZatcaSummary {
  totalInvoices: number;
  totalSales: number;
  totalVAT: number;
  totalSubtotal: number;
}

export default function FinancePage() {
  const { t } = useLang();
  const [invoices, setInvoices] = useState<IInvoice[]>([]);
  const [summary, setSummary] = useState<ZatcaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/zatca?from=${fromDate}&to=${toDate}`);
    if (res.ok) {
      const data = await res.json();
      setInvoices(data.invoices);
      setSummary(data.summary);
    }
    setLoading(false);
  }, [fromDate, toDate]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  function exportCSV() {
    const rows = [
      ['Invoice #', 'Date', 'Customer', 'Subtotal', 'VAT', 'Total'],
      ...invoices.map(inv => [
        inv.invoiceNumber,
        formatDate(inv.createdAt),
        inv.customerName || 'Walk-in',
        inv.subtotal.toFixed(2),
        inv.vatTotal.toFixed(2),
        inv.grandTotal.toFixed(2),
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zatca-report-${fromDate}-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('Finance & ZATCA', 'المالية وهيئة الزكاة')}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('VAT reports & Fatoora compliance', 'تقارير ضريبة القيمة المضافة والفاتورة')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} disabled={invoices.length === 0} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />{t('Export CSV', 'تصدير CSV')}
          </button>
          <button onClick={fetchData} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('From', 'من')}</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('To', 'إلى')}</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field" />
        </div>
        <button onClick={fetchData} className="btn-primary mt-5">{t('Apply', 'تطبيق')}</button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: FileText,   label: t('Total Invoices','إجمالي الفواتير'),     value: summary.totalInvoices,            fmt: (v: number) => v.toString(),           color: 'bg-blue-500/15 text-blue-400' },
            { icon: DollarSign, label: t('Gross Sales','إجمالي المبيعات'),         value: summary.totalSales,               fmt: (v: number) => `SAR ${v.toFixed(2)}`,  color: 'bg-emerald-500/15 text-emerald-400' },
            { icon: TrendingUp, label: t('Total VAT (15%)','إجمالي ضريبة القيمة'), value: summary.totalVAT,                 fmt: (v: number) => `SAR ${v.toFixed(2)}`,  color: 'bg-purple-500/15 text-purple-400' },
            { icon: DollarSign, label: t('Net (excl. VAT)','الصافي قبل الضريبة'), value: summary.totalSubtotal,            fmt: (v: number) => `SAR ${v.toFixed(2)}`,  color: 'bg-cyan-500/15 text-cyan-400' },
          ].map((card, i) => (
            <div key={i} className="stat-card">
              <div className={`p-2 rounded-lg w-fit ${card.color.split(' ')[0]}`}>
                <card.icon className={`w-5 h-5 ${card.color.split(' ')[1]}`} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{card.fmt(card.value)}</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{card.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoices table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('Fatoora History', 'سجل الفاتورة')}</h2>
        </div>
        <table className="w-full">
          <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
            <tr>
              <th className="table-header text-left">{t('Invoice #', 'رقم الفاتورة')}</th>
              <th className="table-header text-left">{t('Date & Time', 'التاريخ والوقت')}</th>
              <th className="table-header text-left">{t('Customer', 'العميل')}</th>
              <th className="table-header text-right">{t('Subtotal', 'قبل الضريبة')}</th>
              <th className="table-header text-right">{t('VAT', 'الضريبة')}</th>
              <th className="table-header text-right">{t('Total', 'الإجمالي')}</th>
              <th className="table-header text-center">QR</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('Loading…', 'جاري التحميل…')}</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('No invoices in selected period', 'لا توجد فواتير في الفترة المحددة')}</td></tr>
            ) : invoices.map(inv => (
              <tr key={inv._id} className="table-row">
                <td className="table-cell font-mono text-xs text-emerald-400">{inv.invoiceNumber}</td>
                <td className="table-cell text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(inv.createdAt)}</td>
                <td className="table-cell" style={{ color: 'var(--text-secondary)' }}>{inv.customerName || t('Walk-in', 'عميل عادي')}</td>
                <td className="table-cell text-right" style={{ color: 'var(--text-secondary)' }}>SAR {inv.subtotal.toFixed(2)}</td>
                <td className="table-cell text-right" style={{ color: '#a855f7' }}>SAR {inv.vatTotal.toFixed(2)}</td>
                <td className="table-cell text-right font-semibold" style={{ color: 'var(--text-primary)' }}>SAR {inv.grandTotal.toFixed(2)}</td>
                <td className="table-cell text-center">
                  {inv.zatcaQR ? (
                    <Image src={inv.zatcaQR} alt="QR" width={32} height={32} unoptimized className="inline-block rounded bg-white p-0.5" />
                  ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* VAT breakdown note */}
      <div className="card p-4 flex items-start gap-3">
        <DollarSign className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t('ZATCA Phase 2 Compliance', 'امتثال هيئة الزكاة المرحلة الثانية')}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {t('All invoices include TLV-encoded QR codes meeting ZATCA e-invoicing requirements. VAT rate: 15%.',
               'جميع الفواتير تتضمن رموز QR مشفرة بـ TLV وفقاً لمتطلبات هيئة الزكاة. معدل ضريبة القيمة المضافة: 15%.')}
          </p>
        </div>
      </div>
    </div>
  );
}
