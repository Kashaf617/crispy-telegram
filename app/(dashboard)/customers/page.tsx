'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Star, Phone, Mail, Users, TrendingUp, Gift, RefreshCw, X, Edit2, Trash2 } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';
import type { ICustomer } from '@/types';

const SEGMENT_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  bronze:   { bg: '#cd7f3218', color: '#cd7f32', label: 'Bronze'   },
  silver:   { bg: '#c0c0c018', color: '#a0a0a0', label: 'Silver'   },
  gold:     { bg: '#ffd70018', color: '#fbbf24', label: 'Gold'     },
  platinum: { bg: '#e5e4e218', color: '#a855f7', label: 'Platinum' },
};

function segmentFromSpend(spent: number): ICustomer['segment'] {
  if (spent >= 10000) return 'platinum';
  if (spent >= 5000)  return 'gold';
  if (spent >= 1000)  return 'silver';
  return 'bronze';
}

const EMPTY_FORM = { name: '', nameAr: '', phone: '', email: '', vatNumber: '', notes: '' };

export default function CustomersPage() {
  const { t } = useLang();
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [editTarget, setEditTarget] = useState<ICustomer | null>(null);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({ ...EMPTY_FORM });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/customers${search ? `?search=${search}` : ''}`);
    if (res.ok) { const d = await res.json(); setCustomers(d.customers); }
    setLoading(false);
  }, [search]);

  useEffect(() => { void fetchCustomers(); }, [fetchCustomers]);

  function openAdd() { setEditTarget(null); setForm({ ...EMPTY_FORM }); setModal(true); }
  function openEdit(c: ICustomer) { setEditTarget(c); setForm({ name: c.name, nameAr: c.nameAr, phone: c.phone, email: c.email || '', vatNumber: c.vatNumber || '', notes: c.notes || '' }); setModal(true); }

  async function deactivate(id: string) {
    if (!confirm(t('Remove this customer?', 'حذف هذا العميل؟'))) return;
    await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    fetchCustomers();
  }

  async function save() {
    if (!form.name || !form.phone) return;
    setSaving(true);
    if (editTarget) {
      await fetch(`/api/customers/${editTarget._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    } else {
      await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    }
    setSaving(false); setModal(false); fetchCustomers();
  }

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) || c.customerCode.toLowerCase().includes(search.toLowerCase())
  );

  const totalCustomers = customers.length;
  const totalSpent     = customers.reduce((s, c) => s + c.totalSpent, 0);
  const goldPlus       = customers.filter(c => c.segment === 'gold' || c.segment === 'platinum').length;
  const totalPoints    = customers.reduce((s, c) => s + c.loyaltyPoints, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('Customer Management', 'إدارة العملاء')}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('CRM, loyalty points & purchase history', 'إدارة العلاقات مع العملاء ونقاط الولاء')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchCustomers} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />{t('Add Customer', 'إضافة عميل')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users,     accent: '#3b82f6', label: t('Total Customers','إجمالي العملاء'),      value: totalCustomers },
          { icon: TrendingUp,accent: '#10b981', label: t('Total Spent','إجمالي الإنفاق'),          value: `SAR ${totalSpent.toFixed(0)}` },
          { icon: Star,      accent: '#fbbf24', label: t('Gold+ Members','أعضاء ذهبي+'),          value: goldPlus },
          { icon: Gift,      accent: '#a855f7', label: t('Loyalty Points (all)','نقاط الولاء الكل'), value: totalPoints },
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchCustomers()}
          placeholder={t('Search name, phone, code…', 'ابحث بالاسم أو الهاتف أو الكود…')}
          className="input-field pl-9" />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
            <tr>
              <th className="table-header text-left">{t('Customer', 'العميل')}</th>
              <th className="table-header text-left">{t('Phone', 'الهاتف')}</th>
              <th className="table-header text-left">{t('Segment', 'الفئة')}</th>
              <th className="table-header text-right">{t('Total Spent', 'إجمالي الإنفاق')}</th>
              <th className="table-header text-right">{t('Points', 'النقاط')}</th>
              <th className="table-header text-right">{t('Visits', 'الزيارات')}</th>
              <th className="table-header"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('Loading…','جاري التحميل…')}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('No customers found','لا يوجد عملاء')}</td></tr>
            ) : filtered.map(c => {
              const seg = SEGMENT_STYLES[segmentFromSpend(c.totalSpent)];
              return (
                <tr key={c._id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                        <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{c.customerCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3" />{c.phone}
                    </div>
                    {c.email && <div className="flex items-center gap-1.5 mt-0.5"><Mail className="w-3 h-3" />{c.email}</div>}
                  </td>
                  <td className="table-cell">
                    <span className="badge font-bold text-xs px-2 py-1 rounded-full"
                      style={{ background: seg.bg, color: seg.color }}>
                      ★ {seg.label}
                    </span>
                  </td>
                  <td className="table-cell text-right font-semibold" style={{ color: 'var(--text-primary)' }}>
                    SAR {c.totalSpent.toFixed(2)}
                  </td>
                  <td className="table-cell text-right">
                    <span className="font-bold" style={{ color: '#a855f7' }}>{c.loyaltyPoints}</span>
                    <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>pts</span>
                  </td>
                  <td className="table-cell text-right" style={{ color: 'var(--text-secondary)' }}>{c.visitCount}</td>
                  <td className="table-cell">
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(c)} className="btn-secondary !px-2 !py-1 text-xs">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deactivate(c._id)} className="btn-secondary !px-2 !py-1 text-xs" style={{ color: '#ef4444' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
          <div className="modal-box max-w-md mx-4 p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {editTarget ? t('Edit Customer','تعديل عميل') : t('Add Customer','إضافة عميل')}
              </h2>
              <button onClick={() => setModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'name',       label: t('Name (EN)','الاسم بالإنجليزية'), colSpan: false },
                { key: 'nameAr',     label: t('Name (AR)','الاسم بالعربية'),   colSpan: false },
                { key: 'phone',      label: t('Phone','الهاتف'),               colSpan: false },
                { key: 'email',      label: t('Email','البريد الإلكتروني'),     colSpan: false },
                { key: 'vatNumber',  label: t('VAT Number','رقم ضريبي'),        colSpan: true },
                { key: 'notes',      label: t('Notes','ملاحظات'),              colSpan: true },
              ].map(f => (
                <div key={f.key} className={f.colSpan ? 'col-span-2' : ''}>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                  <input className="input-field"
                    value={(form as Record<string, string>)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">{t('Cancel','إلغاء')}</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('Save','حفظ')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
