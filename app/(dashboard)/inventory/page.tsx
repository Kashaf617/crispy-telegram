'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, AlertTriangle, Trash2, RefreshCw, X } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';
import { getDaysUntilExpiry, getExpiryBadgeClass, formatDate } from '@/lib/utils';
import type { IBatch, IProduct } from '@/types';

interface BatchWithProduct extends Omit<IBatch, 'productId'> {
  productId: IProduct | string;
}

export default function InventoryPage() {
  const { t } = useLang();
  const [batches, setBatches] = useState<BatchWithProduct[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [wastageModal, setWastageModal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    productId: '', batchNumber: '', quantity: '', unit: 'piece',
    costPrice: '', sellPrice: '', expiryDate: '', manufactureDate: '',
    branchId: '000000000000000000000001',
  });
  const [wastageForm, setWastageForm] = useState({
    quantity: '', reason: 'expired', notes: '', branchId: '000000000000000000000001',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [bRes, pRes] = await Promise.all([
      fetch('/api/batches?status=active'),
      fetch('/api/products?limit=500'),
    ]);
    if (bRes.ok) { const d = await bRes.json(); setBatches(d.batches); }
    if (pRes.ok) { const d = await pRes.json(); setProducts(d.products); }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  async function saveBatch() {
    if (!form.productId || !form.batchNumber || !form.quantity || !form.expiryDate) return;
    setSaving(true);
    const res = await fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, quantity: Number(form.quantity), costPrice: Number(form.costPrice), sellPrice: Number(form.sellPrice) }),
    });
    if (res.ok) { setModal(false); setForm({ productId:'', batchNumber:'', quantity:'', unit:'piece', costPrice:'', sellPrice:'', expiryDate:'', manufactureDate:'', branchId:'000000000000000000000001' }); fetchData(); }
    setSaving(false);
  }

  async function logWastage(batchId: string) {
    const batch = batches.find(b => b._id === batchId);
    if (!batch) return;
    const res = await fetch('/api/wastage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: typeof batch.productId === 'object' ? (batch.productId as IProduct)._id : batch.productId,
        batchId, quantity: Number(wastageForm.quantity), unit: batch.unit,
        reason: wastageForm.reason, notes: wastageForm.notes,
        costLoss: Number(wastageForm.quantity) * batch.costPrice,
        branchId: wastageForm.branchId,
      }),
    });
    if (res.ok) { setWastageModal(null); fetchData(); }
  }

  const filtered = batches.filter(b => {
    const p = typeof b.productId === 'object' ? b.productId as IProduct : null;
    const matchSearch = !search || (p ? p.name.toLowerCase().includes(search.toLowerCase()) || p.nameAr.includes(search) : false) || b.batchNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || b.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const expiringSoon = batches.filter(b => getDaysUntilExpiry(b.expiryDate) <= 30 && getDaysUntilExpiry(b.expiryDate) >= 0).length;
  const expired = batches.filter(b => getDaysUntilExpiry(b.expiryDate) < 0).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{color:'var(--text-primary)'}}>{t('Inventory & Batches', 'المخزون والدفعات')}</h1>
          <p className="text-sm" style={{color:'var(--text-muted)'}}>{t('FEFO-managed stock', 'مخزون مُدار بـ FEFO')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            {t('Add Batch', 'إضافة دفعة')}
          </button>
        </div>
      </div>

      {/* Alert banners */}
      {(expiringSoon > 0 || expired > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {expired > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{expired} {t('batch(es) EXPIRED', 'دفعة/دفعات منتهية الصلاحية')}</p>
            </div>
          )}
          {expiringSoon > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <p className="text-sm text-yellow-300">{expiringSoon} {t('batch(es) expiring within 30 days', 'دفعة/دفعات تنتهي خلال 30 يوماً')}</p>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('Search product, batch…', 'بحث…')} className="input-field pl-9" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-36">
          <option value="">{t('All Status', 'كل الحالات')}</option>
          <option value="active">{t('Active', 'نشط')}</option>
          <option value="expired">{t('Expired', 'منتهي')}</option>
          <option value="depleted">{t('Depleted', 'مستنفد')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead style={{borderBottom:'1px solid var(--border-color)'}}>
            <tr>
              <th className="table-header text-left">{t('Product', 'المنتج')}</th>
              <th className="table-header text-left">{t('Batch #', 'رقم الدفعة')}</th>
              <th className="table-header text-left">{t('Remaining', 'المتبقي')}</th>
              <th className="table-header text-left">{t('Expiry', 'تاريخ الانتهاء')}</th>
              <th className="table-header text-left">{t('Cost', 'التكلفة')}</th>
              <th className="table-header text-left">{t('Status', 'الحالة')}</th>
              <th className="table-header"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('Loading…', 'جاري التحميل…')}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('No batches found', 'لا توجد دفعات')}</td></tr>
            ) : filtered.map(b => {
              const prod = typeof b.productId === 'object' ? b.productId as IProduct : null;
              const days = getDaysUntilExpiry(b.expiryDate);
              return (
                <tr key={b._id} className="table-row">
                  <td className="table-cell">
                    <p className="font-medium" style={{color:'var(--text-primary)'}}>{prod?.name || '—'}</p>
                    <p className="text-xs" style={{color:'var(--text-muted)'}}>{prod?.sku}</p>
                  </td>
                  <td className="table-cell font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{b.batchNumber}</td>
                  <td className="table-cell">
                    <span className="font-semibold" style={{color:'var(--text-primary)'}}>{b.remainingQty}</span>
                    <span className="text-xs ml-1" style={{color:'var(--text-muted)'}}>{b.unit}</span>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${getExpiryBadgeClass(days)}`}>
                      {formatDate(b.expiryDate)} {days >= 0 ? `(${days}d)` : t('EXPIRED', 'منتهي')}
                    </span>
                  </td>
                  <td className="table-cell">SAR {b.costPrice.toFixed(2)}</td>
                  <td className="table-cell">
                    <span className={`badge ${b.status === 'active' ? 'badge-emerald' : b.status === 'expired' ? 'badge-red' : 'badge-slate'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="table-cell">
                    <button onClick={() => setWastageModal(b._id)} className="btn-danger text-xs px-2 py-1">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Batch Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setModal(false)}>
          <div className="modal-box max-w-lg mx-4 p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{color:'var(--text-primary)'}}>{t('Add Batch', 'إضافة دفعة')}</h2>
              <button onClick={() => setModal(false)} style={{color:'var(--text-muted)'}}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs mb-1 font-medium" style={{color:'var(--text-secondary)'}}>{t('Product', 'المنتج')}</label>
                <select value={form.productId} onChange={e => setForm(f => ({...f, productId: e.target.value}))} className="input-field">
                  <option value="">{t('Select product…', 'اختر المنتج…')}</option>
                  {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              {[
                { key: 'batchNumber', label: t('Batch Number','رقم الدفعة'), type: 'text' },
                { key: 'quantity',    label: t('Quantity','الكمية'), type: 'number' },
                { key: 'costPrice',   label: t('Cost Price','سعر التكلفة'), type: 'number' },
                { key: 'sellPrice',   label: t('Sell Price','سعر البيع'), type: 'number' },
                { key: 'expiryDate',  label: t('Expiry Date','تاريخ الانتهاء'), type: 'date' },
                { key: 'manufactureDate', label: t('Manufacture Date','تاريخ التصنيع'), type: 'date' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs mb-1 font-medium" style={{color:'var(--text-secondary)'}}>{field.label}</label>
                  <input
                    type={field.type}
                    value={(form as Record<string,string>)[field.key]}
                    onChange={e => setForm(f => ({...f, [field.key]: e.target.value}))}
                    className="input-field"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs mb-1 font-medium" style={{color:'var(--text-secondary)'}}>{t('Unit','الوحدة')}</label>
                <select value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))} className="input-field">
                  {['kg','g','piece','box','liter','ml'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">{t('Cancel','إلغاء')}</button>
              <button onClick={saveBatch} disabled={saving} className="btn-primary flex-1">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('Save','حفظ')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wastage Modal */}
      {wastageModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setWastageModal(null)}>
          <div className="modal-box max-w-sm mx-4 p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{color:'var(--text-primary)'}}>{t('Log Wastage','تسجيل هدر')}</h2>
              <button onClick={() => setWastageModal(null)} style={{color:'var(--text-muted)'}}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs mb-1 font-medium" style={{color:'var(--text-secondary)'}}>{t('Quantity','الكمية')}</label>
                <input type="number" value={wastageForm.quantity} onChange={e => setWastageForm(f => ({...f, quantity: e.target.value}))} className="input-field" />
              </div>
              <div>
                <label className="block text-xs mb-1 font-medium" style={{color:'var(--text-secondary)'}}>{t('Reason','السبب')}</label>
                <select value={wastageForm.reason} onChange={e => setWastageForm(f => ({...f, reason: e.target.value}))} className="input-field">
                  <option value="expired">{t('Expired','منتهي الصلاحية')}</option>
                  <option value="damaged">{t('Damaged','تالف')}</option>
                  <option value="theft">{t('Theft','سرقة')}</option>
                  <option value="quality">{t('Quality Issue','مشكلة جودة')}</option>
                  <option value="other">{t('Other','أخرى')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 font-medium" style={{color:'var(--text-secondary)'}}>{t('Notes','ملاحظات')}</label>
                <input type="text" value={wastageForm.notes} onChange={e => setWastageForm(f => ({...f, notes: e.target.value}))} className="input-field" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setWastageModal(null)} className="btn-secondary flex-1">{t('Cancel','إلغاء')}</button>
              <button onClick={() => logWastage(wastageModal)} className="btn-danger flex-1">{t('Log','تسجيل')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
