'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Package, RefreshCw, X, Edit2, Barcode, Tag, Trash2 } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';
import type { IProduct } from '@/types';

const UNITS = ['kg', 'g', 'piece', 'box', 'liter', 'ml'];
const EMPTY_FORM = {
  name: '', nameAr: '', sku: '', barcode: '', category: '', categoryAr: '',
  unit: 'piece', basePrice: '', sellPrice: '', vatRate: '15',
  isWeighed: false, minStock: '5', isActive: true,
};

export default function ProductsPage() {
  const { t } = useLang();
  const [products, setProducts] = useState<IProduct[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editTarget, setEditTarget] = useState<IProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '500' });
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    const res = await fetch(`/api/products?${params}`);
    if (res.ok) { const d = await res.json(); setProducts(d.products); }
    setLoading(false);
  }, [search, category]);

  useEffect(() => { void fetchProducts(); }, [fetchProducts]);

  function openAdd() { setEditTarget(null); setForm({ ...EMPTY_FORM }); setModal(true); }
  function openEdit(p: IProduct) {
    setEditTarget(p);
    setForm({
      name: p.name, nameAr: p.nameAr, sku: p.sku, barcode: p.barcode,
      category: p.category, categoryAr: p.categoryAr,
      unit: p.unit, basePrice: String(p.basePrice), sellPrice: String(p.sellPrice),
      vatRate: String(p.vatRate), isWeighed: p.isWeighed,
      minStock: String(p.minStock), isActive: p.isActive,
    });
    setModal(true);
  }

  async function deactivate(id: string) {
    if (!confirm(t('Deactivate this product?', 'إلغاء تفعيل هذا المنتج؟'))) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    fetchProducts();
  }

  async function save() {
    if (!form.name || !form.sku || !form.sellPrice) return;
    setSaving(true);
    const payload = {
      ...form,
      basePrice: Number(form.basePrice),
      sellPrice: Number(form.sellPrice),
      vatRate: Number(form.vatRate),
      minStock: Number(form.minStock),
    };
    if (editTarget) {
      await fetch(`/api/products/${editTarget._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } else {
      await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, branchId: '000000000000000000000001' }) });
    }
    setSaving(false); setModal(false); fetchProducts();
  }

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search);
    const matchCat = !category || p.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('Product Catalog', 'كتالوج المنتجات')}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('Manage products, barcodes, pricing & categories', 'إدارة المنتجات والباركود والأسعار والفئات')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchProducts} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />{t('Add Product', 'إضافة منتج')}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('Total Products','إجمالي المنتجات'), value: products.length,              accent: '#3b82f6' },
          { label: t('Active','نشط'),                    value: products.filter(p=>p.isActive).length, accent: '#10b981' },
          { label: t('Categories','الفئات'),             value: categories.length,             accent: '#a855f7' },
        ].map((s, i) => (
          <div key={i} className="card px-4 py-3 text-center">
            <p className="text-2xl font-bold" style={{ color: s.accent }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchProducts()}
            placeholder={t('Search name, SKU, barcode…', 'ابحث بالاسم أو SKU أو الباركود…')}
            className="input-field pl-9" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="input-field w-44">
          <option value="">{t('All Categories', 'كل الفئات')}</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={fetchProducts} className="btn-secondary">{t('Filter', 'تصفية')}</button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
            <tr>
              <th className="table-header text-left">{t('Product', 'المنتج')}</th>
              <th className="table-header text-left">{t('SKU / Barcode', 'SKU / الباركود')}</th>
              <th className="table-header text-left">{t('Category', 'الفئة')}</th>
              <th className="table-header text-right">{t('Base Price', 'السعر الأساسي')}</th>
              <th className="table-header text-right">{t('Sell Price', 'سعر البيع')}</th>
              <th className="table-header text-center">{t('VAT%', 'ضريبة%')}</th>
              <th className="table-header text-center">{t('Status', 'الحالة')}</th>
              <th className="table-header"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('Loading…','جاري التحميل…')}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('No products found','لا توجد منتجات')}</td></tr>
            ) : filtered.map(p => (
              <tr key={p._id} className="table-row">
                <td className="table-cell">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: '#3b82f618', border: '1px solid #3b82f630' }}>
                      <Package className="w-4 h-4" style={{ color: '#3b82f6' }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.nameAr}</p>
                    </div>
                  </div>
                </td>
                <td className="table-cell">
                  <div className="flex items-center gap-1 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                    <Tag className="w-3 h-3" />{p.sku}
                  </div>
                  {p.barcode && (
                    <div className="flex items-center gap-1 text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      <Barcode className="w-3 h-3" />{p.barcode}
                    </div>
                  )}
                </td>
                <td className="table-cell text-sm" style={{ color: 'var(--text-secondary)' }}>{p.category}</td>
                <td className="table-cell text-right text-sm" style={{ color: 'var(--text-secondary)' }}>SAR {p.basePrice.toFixed(2)}</td>
                <td className="table-cell text-right font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>SAR {p.sellPrice.toFixed(2)}</td>
                <td className="table-cell text-center">
                  <span className="badge badge-slate">{p.vatRate}%</span>
                </td>
                <td className="table-cell text-center">
                  <span className={`badge ${p.isActive ? 'badge-emerald' : 'badge-red'}`}>
                    {p.isActive ? t('Active','نشط') : t('Inactive','غير نشط')}
                  </span>
                </td>
                <td className="table-cell">
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(p)} className="btn-secondary !px-2 !py-1 text-xs">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {p.isActive && (
                      <button onClick={() => deactivate(p._id)} className="btn-secondary !px-2 !py-1 text-xs" style={{ color: '#ef4444' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-2xl mx-4 p-6 animate-fade-in" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {editTarget ? t('Edit Product','تعديل منتج') : t('Add Product','إضافة منتج')}
              </h2>
              <button onClick={() => setModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'name',        label: t('Name (EN)','الاسم بالإنجليزية'), type: 'text' },
                { key: 'nameAr',      label: t('Name (AR)','الاسم بالعربية'),   type: 'text' },
                { key: 'sku',         label: 'SKU',                              type: 'text' },
                { key: 'barcode',     label: t('Barcode','الباركود'),            type: 'text' },
                { key: 'category',    label: t('Category (EN)','الفئة EN'),      type: 'text' },
                { key: 'categoryAr',  label: t('Category (AR)','الفئة AR'),      type: 'text' },
                { key: 'basePrice',   label: t('Base Price','السعر الأساسي'),    type: 'number' },
                { key: 'sellPrice',   label: t('Sell Price','سعر البيع'),        type: 'number' },
                { key: 'vatRate',     label: t('VAT Rate %','معدل الضريبة %'),   type: 'number' },
                { key: 'minStock',    label: t('Min Stock Alert','تنبيه الحد الأدنى'), type: 'number' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                  <input type={f.type} className="input-field"
                    value={(form as Record<string, string | boolean>)[f.key] as string}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Unit','الوحدة')}</label>
                <select className="input-field" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-muted)' }}>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('Weighed Item','منتج موزون')}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('Priced per kg','مسعّر لكل كغ')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={form.isWeighed}
                    onChange={e => setForm(p => ({ ...p, isWeighed: e.target.checked }))} />
                  <div className="w-11 h-6 rounded-full transition-colors" style={{ background: form.isWeighed ? '#10b981' : 'var(--border-color)' }}>
                    <div className="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow transition-transform"
                      style={{ transform: form.isWeighed ? 'translateX(1.25rem)' : 'translateX(0)' }} />
                  </div>
                </label>
              </div>
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
