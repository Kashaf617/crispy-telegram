'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Tag, RefreshCw, X, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/utils';
import type { IPromotion } from '@/types';

const TYPE_INFO: Record<string, { label: string; color: string; desc: string }> = {
  percentage: { label: 'Percentage %', color: '#10b981', desc: 'e.g. 10% off' },
  fixed:      { label: 'Fixed SAR',    color: '#3b82f6', desc: 'e.g. SAR 5 off' },
  bogo:       { label: 'Buy 1 Get 1',  color: '#a855f7', desc: 'Buy one get one free' },
  bundle:     { label: 'Bundle Deal',  color: '#f97316', desc: 'Multi-item discount' },
  loyalty:    { label: 'Loyalty Pts',  color: '#fbbf24', desc: 'Redeem loyalty points' },
};

const EMPTY_FORM = {
  code: '', name: '', nameAr: '', type: 'percentage', value: '',
  minPurchase: '0', maxDiscount: '', usageLimit: '',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  isActive: true,
};

export default function PromotionsPage() {
  const { t } = useLang();
  const [promotions, setPromotions] = useState<IPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterActive, setFilterActive] = useState('');

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterActive === 'active') params.set('active', 'true');
    const res = await fetch(`/api/promotions?${params}`);
    if (res.ok) { const d = await res.json(); setPromotions(d.promotions); }
    setLoading(false);
  }, [filterActive]);

  useEffect(() => { void fetchPromotions(); }, [fetchPromotions]);

  async function save() {
    if (!form.code || !form.name || !form.value) return;
    setSaving(true);
    await fetch('/api/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        value: Number(form.value),
        minPurchase: Number(form.minPurchase),
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        usageLimit:  form.usageLimit  ? Number(form.usageLimit)  : undefined,
      }),
    });
    setSaving(false); setModal(false); fetchPromotions();
  }

  async function toggleActive(p: IPromotion) {
    await fetch(`/api/promotions/${p._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    fetchPromotions();
  }

  const now = new Date();
  const active  = promotions.filter(p => p.isActive && new Date(p.startDate) <= now && new Date(p.endDate) >= now).length;
  const expired = promotions.filter(p => new Date(p.endDate) < now).length;
  const upcoming= promotions.filter(p => new Date(p.startDate) > now).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('Promotions & Discounts', 'العروض والخصومات')}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('Manage discount codes, BOGO, bundles & loyalty offers', 'إدارة كودات الخصم وعروض BOGO والحزم وولاء العملاء')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchPromotions} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => { setForm({ ...EMPTY_FORM }); setModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />{t('New Promo', 'عرض جديد')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('Active Now','نشط الآن'),   value: active,          accent: '#10b981' },
          { label: t('Upcoming','قادم'),          value: upcoming,        accent: '#3b82f6' },
          { label: t('Expired','منتهي'),          value: expired,         accent: '#ef4444' },
        ].map((s, i) => (
          <div key={i} className="card px-4 py-3 text-center">
            <p className="text-2xl font-bold" style={{ color: s.accent }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { v: '',       label: t('All','الكل') },
          { v: 'active', label: t('Active','نشط') },
        ].map(f => (
          <button key={f.v} onClick={() => setFilterActive(f.v)}
            className={filterActive === f.v ? 'btn-primary text-sm' : 'btn-secondary text-sm'}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Promotions grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="card h-36 animate-pulse" style={{ opacity: 0.5 }} />)}
        </div>
      ) : promotions.length === 0 ? (
        <div className="card p-12 text-center" style={{ color: 'var(--text-muted)' }}>
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{t('No promotions yet — create your first one','لا توجد عروض بعد — أنشئ أول عرض')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotions.map(p => {
            const typeInfo = TYPE_INFO[p.type] || TYPE_INFO.percentage;
            const isExpired = new Date(p.endDate) < now;
            const isUpcoming = new Date(p.startDate) > now;
            const isLive = !isExpired && !isUpcoming && p.isActive;
            return (
              <div key={p._id} className="card p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: typeInfo.color + '20', color: typeInfo.color }}>
                        {typeInfo.label}
                      </span>
                      {isLive    && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background:'#10b98120',color:'#10b981' }}>LIVE</span>}
                      {isExpired && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background:'#ef444420',color:'#ef4444' }}>EXPIRED</span>}
                      {isUpcoming&& <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background:'#3b82f620',color:'#3b82f6' }}>SOON</span>}
                    </div>
                    <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: typeInfo.color }}>{p.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black" style={{ color: typeInfo.color }}>
                      {p.type === 'percentage' ? `${p.value}%` : p.type === 'fixed' ? `SAR ${p.value}` : '1+1'}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>OFF</p>
                  </div>
                </div>
                <div className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {p.minPurchase > 0 && <p>Min purchase: SAR {p.minPurchase}</p>}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(p.startDate)} → {formatDate(p.endDate)}</span>
                  </div>
                  {p.usageLimit && <p>Used: {p.usedCount}/{p.usageLimit}</p>}
                </div>
                <button onClick={() => toggleActive(p)}
                  className="flex items-center gap-2 text-xs font-semibold mt-auto"
                  style={{ color: p.isActive ? '#10b981' : 'var(--text-muted)' }}>
                  {p.isActive
                    ? <><CheckCircle2 className="w-4 h-4" />{t('Active — click to deactivate','نشط — انقر للتعطيل')}</>
                    : <><XCircle    className="w-4 h-4" />{t('Inactive — click to activate','غير نشط — انقر للتفعيل')}</>}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-lg mx-4 p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('Create Promotion','إنشاء عرض')}</h2>
              <button onClick={() => setModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'code',        label: t('Promo Code','كود العرض'),        type: 'text' },
                { key: 'name',        label: t('Name (EN)','الاسم بالإنجليزية'), type: 'text' },
                { key: 'nameAr',      label: t('Name (AR)','الاسم بالعربية'),   type: 'text' },
                { key: 'value',       label: t('Discount Value','قيمة الخصم'),  type: 'number' },
                { key: 'minPurchase', label: t('Min Purchase SAR','الحد الأدنى للشراء'), type: 'number' },
                { key: 'maxDiscount', label: t('Max Discount SAR (opt)','الحد الأقصى للخصم'), type: 'number' },
                { key: 'usageLimit',  label: t('Usage Limit (opt)','حد الاستخدام'), type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                  <input type={f.type} className="input-field"
                    value={(form as Record<string, string | boolean>)[f.key] as string}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Type','النوع')}</label>
                <select className="input-field" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  {Object.entries(TYPE_INFO).map(([v, info]) => (
                    <option key={v} value={v}>{info.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Start Date','تاريخ البداية')}</label>
                <input type="date" className="input-field" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('End Date','تاريخ النهاية')}</label>
                <input type="date" className="input-field" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">{t('Cancel','إلغاء')}</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('Create','إنشاء')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
