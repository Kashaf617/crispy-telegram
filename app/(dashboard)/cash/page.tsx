'use client';
import { useState, useEffect, useMemo } from 'react';
import { DollarSign, Clock, CheckCircle2, X, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';
import { formatDateTime } from '@/lib/utils';
import type { IShift } from '@/types';

const SAR_DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.25, 0.10, 0.05];

export default function CashPage() {
  const { t } = useLang();
  const [shifts, setShifts]         = useState<IShift[]>([]);
  const [openShift, setOpenShift]   = useState<IShift | null>(null);
  const [openModal, setOpenModal]   = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [openingFloat, setOpeningFloat] = useState('500');
  const [closingFloat, setClosingFloat] = useState('');
  const [denominations, setDenominations] = useState<Record<number, number>>({});
  const [closeNotes, setCloseNotes] = useState('');
  const denomTotal = useMemo(
    () => Object.entries(denominations).reduce((s, [v, c]) => s + Number(v) * c, 0),
    [denominations],
  );

  useEffect(() => { fetchShifts(); }, []);

  async function fetchShifts() {
    const res = await fetch('/api/shifts');
    if (res.ok) {
      const d = await res.json();
      setShifts(d.shifts);
      const open = d.shifts.find((s: IShift) => s.status === 'open');
      setOpenShift(open || null);
    }
  }

  async function openShiftAction() {
    setSaving(true);
    const res = await fetch('/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'open', openingFloat: Number(openingFloat) }),
    });
    setSaving(false);
    if (res.ok) { setOpenModal(false); fetchShifts(); }
    else { const d = await res.json(); alert(d.error); }
  }

  useEffect(() => {
    if (denomTotal > 0) setClosingFloat(denomTotal.toFixed(2));
  }, [denomTotal]);

  async function closeShiftAction() {
    setSaving(true);
    const res = await fetch('/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'close',
        closingFloat: Number(closingFloat),
        denominations: Object.entries(denominations).map(([v, c]) => ({ value: Number(v), count: c })),
        notes: closeNotes,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setSaving(false); setCloseModal(false);
      const variance = d.variance;
      alert(`Shift closed. Cash variance: SAR ${variance?.toFixed(2) ?? '0.00'}`);
      fetchShifts();
    } else { setSaving(false); }
  }

  const closedShifts = shifts.filter(s => s.status === 'closed');

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('Cash Management', 'إدارة النقدية')}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('Open/close shifts, count cash & Z-reports', 'فتح/إغلاق الوردية وعد النقدية وتقارير Z')}</p>
        </div>
        <button onClick={fetchShifts} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Current shift status */}
      <div className="card p-5">
        {openShift ? (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#10b98120', border: '1px solid #10b98140' }}>
                <Clock className="w-6 h-6" style={{ color: '#10b981' }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#10b98120', color: '#10b981' }}>
                    SHIFT OPEN
                  </span>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{openShift.shiftNumber}</span>
                </div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{openShift.cashierName}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('Opened at','فُتحت في')} {formatDateTime(openShift.openedAt)}</p>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  {[
                    { label: t('Opening Float','الرصيد الافتتاحي'), value: `SAR ${openShift.openingFloat.toFixed(2)}`, color: '#10b981' },
                    { label: t('Sales','المبيعات'),                  value: `SAR ${openShift.totalSales.toFixed(2)}`,   color: '#3b82f6' },
                    { label: t('Transactions','المعاملات'),          value: openShift.transactionCount,                 color: '#a855f7' },
                  ].map((m, i) => (
                    <div key={i}>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
                      <p className="font-bold text-lg" style={{ color: m.color }}>{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setCloseModal(true)} className="btn-danger flex items-center gap-2 flex-shrink-0">
              {t('Close Shift', 'إغلاق الوردية')}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}>
                <DollarSign className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('No shift open', 'لا توجد وردية مفتوحة')}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('Open a shift to start accepting sales', 'افتح وردية لبدء قبول المبيعات')}</p>
              </div>
            </div>
            <button onClick={() => setOpenModal(true)} className="btn-primary flex items-center gap-2">
              {t('Open Shift', 'فتح الوردية')}
            </button>
          </div>
        )}
      </div>

      {/* Shift history */}
      {closedShifts.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('Shift History (Z-Reports)', 'سجل الورديات (تقارير Z)')}</h3>
          </div>
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th className="table-header text-left">{t('Shift #', 'رقم الوردية')}</th>
                <th className="table-header text-left">{t('Cashier', 'الكاشير')}</th>
                <th className="table-header text-left">{t('Opened', 'فُتحت')}</th>
                <th className="table-header text-left">{t('Closed', 'أُغلقت')}</th>
                <th className="table-header text-right">{t('Opening Float', 'الرصيد')}</th>
                <th className="table-header text-right">{t('Total Sales', 'المبيعات')}</th>
                <th className="table-header text-right">{t('Cash', 'نقدي')}</th>
                <th className="table-header text-right">{t('Variance', 'الفارق')}</th>
              </tr>
            </thead>
            <tbody>
              {closedShifts.map(s => {
                const variance = s.cashVariance ?? 0;
                return (
                  <tr key={s._id} className="table-row">
                    <td className="table-cell font-mono text-xs" style={{ color: '#10b981' }}>{s.shiftNumber}</td>
                    <td className="table-cell text-sm" style={{ color: 'var(--text-secondary)' }}>{s.cashierName}</td>
                    <td className="table-cell text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(s.openedAt)}</td>
                    <td className="table-cell text-xs" style={{ color: 'var(--text-muted)' }}>{s.closedAt ? formatDateTime(s.closedAt) : '—'}</td>
                    <td className="table-cell text-right" style={{ color: 'var(--text-secondary)' }}>SAR {s.openingFloat.toFixed(2)}</td>
                    <td className="table-cell text-right font-semibold" style={{ color: 'var(--text-primary)' }}>SAR {s.totalSales.toFixed(2)}</td>
                    <td className="table-cell text-right" style={{ color: 'var(--text-secondary)' }}>SAR {s.totalCash.toFixed(2)}</td>
                    <td className="table-cell text-right">
                      <span className="flex items-center justify-end gap-1 font-semibold"
                        style={{ color: variance < 0 ? '#ef4444' : variance > 0 ? '#f97316' : '#10b981' }}>
                        {variance < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : variance > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        SAR {Math.abs(variance).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Open Shift Modal */}
      {openModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setOpenModal(false)}>
          <div className="modal-box max-w-sm mx-4 p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('Open Shift', 'فتح الوردية')}</h2>
              <button onClick={() => setOpenModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Opening Float (SAR)', 'الرصيد الافتتاحي (ريال)')}</label>
                <input type="number" className="input-field text-lg font-bold" value={openingFloat}
                  onChange={e => setOpeningFloat(e.target.value)} />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t('Count the cash in the drawer before starting', 'احسب النقدية في الدرج قبل البدء')}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setOpenModal(false)} className="btn-secondary flex-1">{t('Cancel', 'إلغاء')}</button>
              <button onClick={openShiftAction} disabled={saving} className="btn-primary flex-1">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('Open Shift', 'فتح الوردية')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Shift Modal — denomination count */}
      {closeModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCloseModal(false)}>
          <div className="modal-box max-w-lg mx-4 p-6 animate-fade-in" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('Close Shift & Count Cash', 'إغلاق الوردية وعد النقدية')}</h2>
              <button onClick={() => setCloseModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>

            {/* Denomination table */}
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>{t('Cash Count by Denomination', 'عد النقدية حسب الفئة')}</p>
            <div className="space-y-2 mb-4">
              {SAR_DENOMINATIONS.map(d => (
                <div key={d} className="flex items-center gap-3">
                  <span className="w-20 text-sm font-mono text-right flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                    SAR {d >= 1 ? d : d.toFixed(2)}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>×</span>
                  <input type="number" min={0} className="input-field w-20 text-center !py-1.5 text-sm"
                    value={denominations[d] ?? ''}
                    onChange={e => setDenominations(p => ({ ...p, [d]: Number(e.target.value) || 0 }))} />
                  <span className="flex-1 text-sm text-right font-semibold" style={{ color: '#10b981' }}>
                    = SAR {((denominations[d] ?? 0) * d).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl mb-4" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t('Total Counted', 'الإجمالي المعدود')}</span>
                <span className="text-xl font-black" style={{ color: '#10b981' }}>SAR {denomTotal.toFixed(2)}</span>
              </div>
              {openShift && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('Expected', 'المتوقع')}</span>
                  <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    SAR {(openShift.openingFloat + openShift.totalCash).toFixed(2)}
                  </span>
                </div>
              )}
              {openShift && denomTotal > 0 && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    {denomTotal < (openShift.openingFloat + openShift.totalCash)
                      ? <><TrendingDown className="w-3.5 h-3.5 text-red-400" />{t('Shortage','عجز')}</>
                      : denomTotal > (openShift.openingFloat + openShift.totalCash)
                        ? <><TrendingUp className="w-3.5 h-3.5 text-orange-400" />{t('Overage','زيادة')}</>
                        : <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />{t('Balanced','متوازن')}</>}
                  </span>
                  <span className="font-semibold"
                    style={{ color: Math.abs(denomTotal - (openShift.openingFloat + openShift.totalCash)) < 0.01 ? '#10b981' : '#f97316' }}>
                    SAR {Math.abs(denomTotal - (openShift.openingFloat + openShift.totalCash)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Notes','ملاحظات')}</label>
              <input className="input-field" value={closeNotes} onChange={e => setCloseNotes(e.target.value)} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setCloseModal(false)} className="btn-secondary flex-1">{t('Cancel','إلغاء')}</button>
              <button onClick={closeShiftAction} disabled={saving} className="btn-danger flex-1">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('Close Shift','إغلاق الوردية')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
