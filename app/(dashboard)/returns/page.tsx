'use client';
import { useState, useEffect } from 'react';
import { Search, RefreshCw, RotateCcw, X, CheckCircle2 } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';
import { formatDateTime } from '@/lib/utils';
import type { IInvoice, IReturn } from '@/types';

const REFUND_METHODS = ['cash', 'card', 'loyalty', 'credit_note'] as const;

export default function ReturnsPage() {
  const { t } = useLang();
  const [returns, setReturns]       = useState<IReturn[]>([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(false);
  const [saving, setSaving]         = useState(false);
  const [invSearch, setInvSearch]   = useState('');
  const [foundInv, setFoundInv]     = useState<IInvoice | null>(null);
  const [searching, setSearching]   = useState(false);
  const [reason, setReason]         = useState('');
  const [refundMethod, setRefundMethod] = useState<typeof REFUND_METHODS[number]>('cash');
  const [selectedLines, setSelectedLines] = useState<Set<number>>(new Set());

  useEffect(() => { fetchReturns(); }, []);

  async function fetchReturns() {
    setLoading(true);
    const res = await fetch('/api/returns');
    if (res.ok) { const d = await res.json(); setReturns(d.returns); }
    setLoading(false);
  }

  async function searchInvoice() {
    if (!invSearch.trim()) return;
    setSearching(true); setFoundInv(null); setSelectedLines(new Set());
    const res = await fetch(`/api/invoices?search=${encodeURIComponent(invSearch.trim())}`);
    if (res.ok) {
      const d = await res.json();
      const inv = (d.invoices || []).find((i: IInvoice) =>
        i.invoiceNumber.toLowerCase() === invSearch.trim().toLowerCase()
      );
      setFoundInv(inv || null);
    }
    setSearching(false);
  }

  function toggleLine(idx: number) {
    setSelectedLines(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function processReturn() {
    if (!foundInv || selectedLines.size === 0 || !reason) return;
    setSaving(true);
    const lines = [...selectedLines].map(i => foundInv.lines[i]);
    const subtotal  = lines.reduce((s, l) => s + (l.lineTotal - l.vatAmount), 0);
    const vatTotal  = lines.reduce((s, l) => s + l.vatAmount, 0);
    const grandTotal = lines.reduce((s, l) => s + l.lineTotal, 0);

    const res = await fetch('/api/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalInvoiceId: foundInv._id,
        lines, subtotal, vatTotal, grandTotal,
        reason, refundMethod,
        branchId: foundInv.branchId,
      }),
    });
    setSaving(false);
    if (res.ok) { setModal(false); setFoundInv(null); setInvSearch(''); fetchReturns(); }
  }

  const totalRefunded = returns.reduce((s, r) => s + r.grandTotal, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('Returns & Refunds', 'المرتجعات والاسترداد')}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('Process sales returns and issue refunds', 'معالجة مرتجعات المبيعات وإصدار المبالغ المستردة')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchReturns} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => { setModal(true); setFoundInv(null); setInvSearch(''); setSelectedLines(new Set()); setReason(''); }}
            className="btn-primary flex items-center gap-2 text-sm">
            <RotateCcw className="w-4 h-4" />{t('New Return', 'مرتجع جديد')}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card px-4 py-3 text-center">
          <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{returns.length}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t('Total Returns','إجمالي المرتجعات')}</p>
        </div>
        <div className="card px-4 py-3 text-center">
          <p className="text-2xl font-bold" style={{ color: '#f97316' }}>SAR {totalRefunded.toFixed(2)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t('Total Refunded','إجمالي المسترد')}</p>
        </div>
      </div>

      {/* Returns table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
            <tr>
              <th className="table-header text-left">{t('Return #', 'رقم المرتجع')}</th>
              <th className="table-header text-left">{t('Original Invoice', 'الفاتورة الأصلية')}</th>
              <th className="table-header text-left">{t('Reason', 'السبب')}</th>
              <th className="table-header text-left">{t('Refund Method', 'طريقة الاسترداد')}</th>
              <th className="table-header text-right">{t('Amount', 'المبلغ')}</th>
              <th className="table-header text-left">{t('Date', 'التاريخ')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('Loading…','جاري التحميل…')}</td></tr>
            ) : returns.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {t('No returns processed yet','لم تتم معالجة أي مرتجعات بعد')}
              </td></tr>
            ) : returns.map(r => (
              <tr key={r._id} className="table-row">
                <td className="table-cell font-mono text-xs" style={{ color: '#ef4444' }}>{r.returnNumber}</td>
                <td className="table-cell font-mono text-xs" style={{ color: '#10b981' }}>{r.originalInvoiceNumber}</td>
                <td className="table-cell text-sm" style={{ color: 'var(--text-secondary)' }}>{r.reason}</td>
                <td className="table-cell">
                  <span className="badge badge-slate">{r.refundMethod.replace('_',' ')}</span>
                </td>
                <td className="table-cell text-right font-semibold" style={{ color: '#ef4444' }}>
                  SAR {r.grandTotal.toFixed(2)}
                </td>
                <td className="table-cell text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Return Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-xl mx-4 p-6 animate-fade-in" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('Process Return', 'معالجة مرتجع')}</h2>
              <button onClick={() => setModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>

            {/* Invoice search */}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                {t('Invoice Number', 'رقم الفاتورة')}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <input className="input-field pl-9 font-mono" placeholder="INV-20250101-0001"
                    value={invSearch} onChange={e => setInvSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchInvoice()} />
                </div>
                <button onClick={searchInvoice} disabled={searching} className="btn-secondary">
                  {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : t('Find', 'بحث')}
                </button>
              </div>
              {!foundInv && invSearch && !searching && (
                <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{t('Invoice not found', 'الفاتورة غير موجودة')}</p>
              )}
            </div>

            {/* Invoice lines selection */}
            {foundInv && (
              <div className="mb-4">
                <div className="p-3 rounded-xl mb-3" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{foundInv.invoiceNumber}</span>
                    <span className="text-sm font-bold" style={{ color: '#10b981' }}>SAR {foundInv.grandTotal.toFixed(2)}</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {foundInv.customerName || t('Walk-in customer', 'عميل عادي')} · {formatDateTime(foundInv.createdAt)}
                  </p>
                </div>

                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {t('Select items to return:', 'اختر العناصر للإرجاع:')}
                </p>
                <div className="space-y-2">
                  {foundInv.lines.map((line, idx) => (
                    <label key={idx}
                      className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
                      style={{
                        background: selectedLines.has(idx) ? '#10b98110' : 'var(--bg-muted)',
                        border: `1px solid ${selectedLines.has(idx) ? '#10b98140' : 'var(--border-color)'}`,
                      }}>
                      <input type="checkbox" className="w-4 h-4 accent-emerald-500"
                        checked={selectedLines.has(idx)}
                        onChange={() => toggleLine(idx)} />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{line.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{line.qty} × SAR {line.unitPrice.toFixed(2)}</p>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: '#10b981' }}>SAR {line.lineTotal.toFixed(2)}</p>
                    </label>
                  ))}
                </div>

                {selectedLines.size > 0 && (
                  <div className="mt-3 p-2.5 rounded-xl text-right" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
                    <span className="text-sm font-bold" style={{ color: '#ef4444' }}>
                      {t('Refund amount:','مبلغ الاسترداد:')} SAR {
                        [...selectedLines].reduce((s, i) => s + foundInv.lines[i].lineTotal, 0).toFixed(2)
                      }
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Reason + method */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Return Reason', 'سبب الإرجاع')}</label>
                <input className="input-field" placeholder={t('e.g. Defective item','مثال: منتج معيب')}
                  value={reason} onChange={e => setReason(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Refund Method', 'طريقة الاسترداد')}</label>
                <select className="input-field" value={refundMethod}
                  onChange={e => setRefundMethod(e.target.value as typeof REFUND_METHODS[number])}>
                  {REFUND_METHODS.map(m => <option key={m} value={m}>{m.replace('_',' ')}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">{t('Cancel','إلغاء')}</button>
              <button onClick={processReturn}
                disabled={saving || !foundInv || selectedLines.size === 0 || !reason}
                className="btn-danger flex-1 flex items-center justify-center gap-2">
                {saving
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><CheckCircle2 className="w-4 h-4" />{t('Process Return','معالجة المرتجع')}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
