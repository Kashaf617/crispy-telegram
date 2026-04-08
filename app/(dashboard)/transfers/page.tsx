'use client';
import { useState, useEffect } from 'react';
import { Plus, ArrowLeftRight, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';
import { formatDateTime } from '@/lib/utils';
import type { IStockTransfer } from '@/types';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  pending:    { bg: '#f97316', color: '#f97316' },
  in_transit: { bg: '#3b82f6', color: '#3b82f6' },
  received:   { bg: '#10b981', color: '#10b981' },
  cancelled:  { bg: '#ef4444', color: '#ef4444' },
};

const EMPTY_TRANSFER = {
  fromBranchId: '000000000000000000000001',
  toBranchId:   '000000000000000000000002',
  notes: '',
  lines: [{ productId: '', productName: '', qty: 1, unit: 'piece' }],
};

export default function TransfersPage() {
  const { t } = useLang();
  const [transfers, setTransfers] = useState<IStockTransfer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({ ...EMPTY_TRANSFER });

  useEffect(() => { fetchTransfers(); }, []);

  async function fetchTransfers() {
    setLoading(true);
    const res = await fetch('/api/transfers');
    if (res.ok) { const d = await res.json(); setTransfers(d.transfers); }
    setLoading(false);
  }

  function addLine() {
    setForm(p => ({ ...p, lines: [...p.lines, { productId: '', productName: '', qty: 1, unit: 'piece' }] }));
  }
  function removeLine(i: number) {
    setForm(p => ({ ...p, lines: p.lines.filter((_, idx) => idx !== i) }));
  }
  function updateLine(i: number, patch: Partial<typeof EMPTY_TRANSFER.lines[0]>) {
    setForm(p => {
      const lines = [...p.lines];
      lines[i] = { ...lines[i], ...patch };
      return { ...p, lines };
    });
  }

  async function save() {
    if (form.lines.every(l => !l.productName)) return;
    setSaving(true);
    await fetch('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false); setModal(false); fetchTransfers();
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/transfers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchTransfers();
  }

  const pending   = transfers.filter(t => t.status === 'pending').length;
  const inTransit = transfers.filter(t => t.status === 'in_transit').length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('Stock Transfers', 'تحويلات المخزون')}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('Move stock between branches', 'نقل المخزون بين الفروع')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchTransfers} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => { setForm({ ...EMPTY_TRANSFER }); setModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />{t('New Transfer', 'تحويل جديد')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('Total Transfers', 'إجمالي التحويلات'), value: transfers.length, accent: '#3b82f6' },
          { label: t('Pending',         'معلق'),             value: pending,          accent: '#f97316' },
          { label: t('In Transit',      'في الطريق'),        value: inTransit,        accent: '#a855f7' },
        ].map((s, i) => (
          <div key={i} className="card px-4 py-3 text-center">
            <p className="text-2xl font-bold" style={{ color: s.accent }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
            <tr>
              <th className="table-header text-left">{t('Transfer #', 'رقم التحويل')}</th>
              <th className="table-header text-left">{t('From → To', 'من → إلى')}</th>
              <th className="table-header text-center">{t('Items', 'العناصر')}</th>
              <th className="table-header text-left">{t('Status', 'الحالة')}</th>
              <th className="table-header text-left">{t('Date', 'التاريخ')}</th>
              <th className="table-header text-left">{t('Actions', 'إجراءات')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('Loading…', 'جاري التحميل…')}</td></tr>
            ) : transfers.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {t('No transfers yet', 'لا توجد تحويلات بعد')}
              </td></tr>
            ) : transfers.map(tr => {
              const ss = STATUS_STYLES[tr.status] || STATUS_STYLES.pending;
              return (
                <tr key={tr._id} className="table-row">
                  <td className="table-cell font-mono text-xs" style={{ color: '#3b82f6' }}>{tr.transferNumber}</td>
                  <td className="table-cell text-sm">
                    <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-mono text-xs">{String(tr.fromBranchId).slice(-4)}</span>
                      <ArrowLeftRight className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="font-mono text-xs">{String(tr.toBranchId).slice(-4)}</span>
                    </div>
                  </td>
                  <td className="table-cell text-center" style={{ color: 'var(--text-primary)' }}>{tr.lines.length}</td>
                  <td className="table-cell">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: ss.bg + '20', color: ss.color }}>
                      {tr.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="table-cell text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(tr.createdAt)}</td>
                  <td className="table-cell">
                    <div className="flex gap-1.5">
                      {tr.status === 'pending' && (
                        <button onClick={() => updateStatus(tr._id, 'in_transit')}
                          className="text-xs px-2 py-1 rounded-lg font-semibold"
                          style={{ background: '#3b82f620', color: '#3b82f6' }}>
                          {t('Dispatch', 'شحن')}
                        </button>
                      )}
                      {tr.status === 'in_transit' && (
                        <button onClick={() => updateStatus(tr._id, 'received')}
                          className="text-xs px-2 py-1 rounded-lg font-semibold flex items-center gap-1"
                          style={{ background: '#10b98120', color: '#10b981' }}>
                          <CheckCircle2 className="w-3 h-3" />{t('Received', 'استلام')}
                        </button>
                      )}
                      {tr.status === 'pending' && (
                        <button onClick={() => updateStatus(tr._id, 'cancelled')}
                          className="text-xs px-2 py-1 rounded-lg font-semibold"
                          style={{ background: '#ef444420', color: '#ef4444' }}>
                          {t('Cancel', 'إلغاء')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-xl mx-4 p-6 animate-fade-in" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('New Stock Transfer', 'تحويل مخزون جديد')}</h2>
              <button onClick={() => setModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('From Branch', 'من الفرع')}</label>
                <input className="input-field font-mono" value={form.fromBranchId}
                  onChange={e => setForm(p => ({ ...p, fromBranchId: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('To Branch', 'إلى الفرع')}</label>
                <input className="input-field font-mono" value={form.toBranchId}
                  onChange={e => setForm(p => ({ ...p, toBranchId: e.target.value }))} />
              </div>
            </div>

            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>{t('Transfer Lines', 'بنود التحويل')}</p>
            <div className="space-y-2 mb-3">
              {form.lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <input placeholder={t('Product name', 'اسم المنتج')} className="input-field text-sm"
                      value={line.productName}
                      onChange={e => updateLine(i, { productName: e.target.value })} />
                  </div>
                  <div className="col-span-3">
                    <input type="number" min={1} placeholder={t('Qty', 'الكمية')} className="input-field text-sm"
                      value={line.qty}
                      onChange={e => updateLine(i, { qty: Number(e.target.value) })} />
                  </div>
                  <div className="col-span-2">
                    <select className="input-field text-sm" value={line.unit}
                      onChange={e => updateLine(i, { unit: e.target.value })}>
                      {['piece','kg','g','box','liter'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {form.lines.length > 1 && (
                      <button onClick={() => removeLine(i)} style={{ color: '#ef4444' }}><X className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addLine} className="btn-secondary text-xs flex items-center gap-1 mb-4">
              <Plus className="w-3.5 h-3.5" />{t('Add Line', 'إضافة بند')}
            </button>

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Notes', 'ملاحظات')}</label>
              <input className="input-field" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">{t('Cancel', 'إلغاء')}</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('Create Transfer', 'إنشاء تحويل')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
