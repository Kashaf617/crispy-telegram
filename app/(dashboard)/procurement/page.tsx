'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, X, CheckCircle, Truck, FileText, Wallet } from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';
import { formatDate, generateInvoiceNumber } from '@/lib/utils';
import type { IGoodsReceipt, IPurchaseOrder, ISupplierInvoice, IVendor, IProduct } from '@/types';

interface POLine { productId: string; name: string; qty: number; unit: string; unitCost: number; vatRate: number; vatAmount: number; lineTotal: number; }
interface PayablesSummary { totalInvoiced: number; totalPaid: number; totalOutstanding: number; overdueCount: number; }

export default function ProcurementPage() {
  const { t } = useLang();
  const [orders, setOrders] = useState<IPurchaseOrder[]>([]);
  const [invoices, setInvoices] = useState<ISupplierInvoice[]>([]);
  const [receipts, setReceipts] = useState<IGoodsReceipt[]>([]);
  const [vendors, setVendors] = useState<IVendor[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [receiveModal, setReceiveModal] = useState<string | null>(null);
  const [invoiceModal, setInvoiceModal] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [payablesSummary, setPayablesSummary] = useState<PayablesSummary>({ totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0, overdueCount: 0 });
  const [form, setForm] = useState({ vendorId: '', lines: [] as POLine[], notes: '', expectedDelivery: '', branchId: '000000000000000000000001' });
  const [newLine, setNewLine] = useState({ productId: '', qty: 1, unitCost: 0, vatRate: 0.15 });
  const [invoiceForm, setInvoiceForm] = useState({ supplierReference: '', invoiceDate: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], paidAmount: '', notes: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'bank_transfer', reference: '', note: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [oRes, vRes, pRes, sRes, rRes] = await Promise.all([
      fetch('/api/purchase-orders'),
      fetch('/api/vendors?limit=200'),
      fetch('/api/products?limit=500'),
      fetch('/api/supplier-invoices'),
      fetch('/api/goods-receipts'),
    ]);
    if (oRes.ok) setOrders((await oRes.json()).orders);
    if (vRes.ok) setVendors((await vRes.json()).vendors);
    if (pRes.ok) setProducts((await pRes.json()).products);
    if (sRes.ok) {
      const data = await sRes.json();
      setInvoices(data.invoices);
      setPayablesSummary(data.summary);
    }
    if (rRes.ok) setReceipts((await rRes.json()).receipts);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  function addLine() {
    const prod = products.find(p => p._id === newLine.productId);
    if (!prod || !newLine.qty || !newLine.unitCost) return;
    const vatAmount = newLine.qty * newLine.unitCost * newLine.vatRate;
    const lineTotal = newLine.qty * newLine.unitCost + vatAmount;
    setForm(f => ({
      ...f,
      lines: [...f.lines, {
        productId: prod._id, name: prod.name, qty: newLine.qty,
        unit: prod.unit, unitCost: newLine.unitCost,
        vatRate: newLine.vatRate, vatAmount, lineTotal,
      }],
    }));
    setNewLine({ productId: '', qty: 1, unitCost: 0, vatRate: 0.15 });
  }

  async function savePO() {
    if (!form.vendorId || form.lines.length === 0) return;
    setSaving(true);
    const subtotal = form.lines.reduce((s, l) => s + l.qty * l.unitCost, 0);
    const vatTotal = form.lines.reduce((s, l) => s + l.vatAmount, 0);
    const res = await fetch('/api/purchase-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poNumber: generateInvoiceNumber('PO'),
        ...form,
        subtotal: parseFloat(subtotal.toFixed(2)),
        vatTotal: parseFloat(vatTotal.toFixed(2)),
        grandTotal: parseFloat((subtotal + vatTotal).toFixed(2)),
        landedCostFactor: 1,
      }),
    });
    if (res.ok) { setModal(false); setForm({ vendorId: '', lines: [], notes: '', expectedDelivery: '', branchId: '000000000000000000000001' }); fetchData(); }
    setSaving(false);
  }

  async function receivePO(id: string) {
    await fetch(`/api/purchase-orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'received' }),
    });
    setReceiveModal(null);
    fetchData();
  }

  function openInvoiceForPO(order: IPurchaseOrder) {
    const vendor = vendors.find(v => v._id === (typeof order.vendorId === 'string' ? order.vendorId : (order.vendorId as unknown as IVendor)._id));
    const paymentTerms = vendor?.paymentTerms || 30;
    setInvoiceForm({
      supplierReference: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + paymentTerms * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paidAmount: '',
      notes: order.notes || '',
    });
    setInvoiceModal(order._id);
  }

  async function saveSupplierInvoice() {
    if (!invoiceModal) return;
    const order = orders.find(o => o._id === invoiceModal);
    if (!order) return;
    setSaving(true);
    const res = await fetch('/api/supplier-invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        purchaseOrderId: order._id,
        vendorId: typeof order.vendorId === 'string' ? order.vendorId : (order.vendorId as unknown as IVendor)._id,
        supplierReference: invoiceForm.supplierReference || undefined,
        invoiceDate: invoiceForm.invoiceDate,
        dueDate: invoiceForm.dueDate,
        paidAmount: Number(invoiceForm.paidAmount || 0),
        notes: invoiceForm.notes || undefined,
        branchId: order.branchId,
        lines: order.lines,
        subtotal: order.subtotal,
        vatTotal: order.vatTotal,
        grandTotal: order.grandTotal,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setInvoiceModal(null);
      fetchData();
    }
  }

  async function recordPayment() {
    if (!paymentModal || !paymentForm.amount) return;
    setSaving(true);
    const res = await fetch(`/api/supplier-invoices/${paymentModal}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'record_payment',
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        note: paymentForm.note || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setPaymentModal(null);
      setPaymentForm({ amount: '', method: 'bank_transfer', reference: '', note: '' });
      fetchData();
    }
  }

  const filtered = orders.filter(o => !filterStatus || o.status === filterStatus);
  const selectedOrder = invoiceModal ? orders.find(o => o._id === invoiceModal) : null;
  const selectedInvoice = paymentModal ? invoices.find(i => i._id === paymentModal) : null;

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { draft: 'badge-slate', sent: 'badge-blue', received: 'badge-emerald', partial: 'badge-yellow', cancelled: 'badge-red' };
    return map[s] || 'badge-slate';
  };

  const invoiceStatusBadge = (s: string) => {
    const map: Record<string, string> = { draft: 'badge-slate', posted: 'badge-blue', partial: 'badge-yellow', paid: 'badge-emerald', overdue: 'badge-red', cancelled: 'badge-slate' };
    return map[s] || 'badge-slate';
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('Procurement', 'المشتريات')}</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('Purchase orders & vendor management', 'أوامر الشراء وإدارة الموردين')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-secondary"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />{t('New PO', 'أمر شراء جديد')}
          </button>
        </div>
      </div>

      {/* Filter */}
      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-40">
        <option value="">{t('All Status', 'كل الحالات')}</option>
        {['draft','sent','received','partial','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: FileText, label: t('Supplier Bills','فواتير الموردين'), value: payablesSummary.totalInvoiced, color: '#3b82f6' },
          { icon: Wallet, label: t('Paid to Vendors','المدفوع للموردين'), value: payablesSummary.totalPaid, color: '#10b981' },
          { icon: Wallet, label: t('Outstanding Payables','الذمم المستحقة'), value: payablesSummary.totalOutstanding, color: '#f97316' },
          { icon: FileText, label: t('Overdue Bills','فواتير متأخرة'), value: payablesSummary.overdueCount, color: '#ef4444', raw: true },
        ].map((card, i) => (
          <div key={i} className="stat-card">
            <div className="p-2.5 rounded-xl w-fit" style={{ background: card.color + '18', border: `1px solid ${card.color}30` }}>
              <card.icon className="w-5 h-5" style={{ color: card.color }} />
            </div>
            <div>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {card.raw ? card.value : `SAR ${(card.value as number).toFixed(2)}`}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
            <tr>
              <th className="table-header text-left">{t('PO Number', 'رقم الأمر')}</th>
              <th className="table-header text-left">{t('Vendor', 'المورد')}</th>
              <th className="table-header text-left">{t('Total', 'الإجمالي')}</th>
              <th className="table-header text-left">{t('Expected', 'المتوقع')}</th>
              <th className="table-header text-left">{t('Status', 'الحالة')}</th>
              <th className="table-header"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('Loading…', 'جاري التحميل…')}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>{t('No purchase orders', 'لا توجد أوامر شراء')}</td></tr>
            ) : filtered.map(po => {
              const vendor = typeof po.vendorId === 'object' ? po.vendorId as unknown as IVendor : vendors.find(v => v._id === po.vendorId);
              return (
                <tr key={po._id} className="table-row">
                  <td className="table-cell font-mono text-sm text-emerald-400">{po.poNumber}</td>
                  <td className="table-cell">{vendor?.name || '—'}</td>
                  <td className="table-cell font-semibold" style={{ color: 'var(--text-primary)' }}>SAR {po.grandTotal.toFixed(2)}</td>
                  <td className="table-cell" style={{ color: 'var(--text-muted)' }}>{po.expectedDelivery ? formatDate(po.expectedDelivery) : '—'}</td>
                  <td className="table-cell"><span className={`badge ${statusBadge(po.status)}`}>{po.status}</span></td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      {(po.status === 'draft' || po.status === 'sent') && (
                        <button onClick={() => setReceiveModal(po._id)} className="btn-primary text-xs px-2 py-1 flex items-center gap-1">
                          <Truck className="w-3 h-3" />{t('Receive', 'استلام')}
                        </button>
                      )}
                      {po.status !== 'cancelled' && (
                        <button onClick={() => openInvoiceForPO(po)} className="btn-secondary text-xs px-2 py-1 flex items-center gap-1">
                          <FileText className="w-3 h-3" />{t('Create Bill', 'إنشاء فاتورة')}
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

      <div className="card overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('Supplier Invoices & Payables', 'فواتير الموردين والذمم')}</h2>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t(`${invoices.length} bills`, `${invoices.length} فاتورة`)}</span>
        </div>
        <table className="w-full">
          <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
            <tr>
              <th className="table-header text-left">{t('Invoice #', 'رقم الفاتورة')}</th>
              <th className="table-header text-left">{t('Vendor', 'المورد')}</th>
              <th className="table-header text-left">{t('Due Date', 'تاريخ الاستحقاق')}</th>
              <th className="table-header text-right">{t('Total', 'الإجمالي')}</th>
              <th className="table-header text-right">{t('Outstanding', 'المتبقي')}</th>
              <th className="table-header text-left">{t('Status', 'الحالة')}</th>
              <th className="table-header"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>{t('Loading…', 'جاري التحميل…')}</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>{t('No supplier invoices yet', 'لا توجد فواتير موردين بعد')}</td></tr>
            ) : invoices.map(inv => {
              const vendor = typeof inv.vendorId === 'object' ? inv.vendorId as IVendor : vendors.find(v => v._id === inv.vendorId);
              return (
                <tr key={inv._id} className="table-row">
                  <td className="table-cell font-mono text-sm text-emerald-400">{inv.invoiceNumber}</td>
                  <td className="table-cell" style={{ color: 'var(--text-primary)' }}>{vendor?.name || '—'}</td>
                  <td className="table-cell" style={{ color: 'var(--text-muted)' }}>{formatDate(inv.dueDate)}</td>
                  <td className="table-cell text-right font-semibold" style={{ color: 'var(--text-primary)' }}>SAR {inv.grandTotal.toFixed(2)}</td>
                  <td className="table-cell text-right" style={{ color: inv.balanceDue > 0 ? '#f97316' : '#10b981' }}>SAR {inv.balanceDue.toFixed(2)}</td>
                  <td className="table-cell"><span className={`badge ${invoiceStatusBadge(inv.status)}`}>{inv.status}</span></td>
                  <td className="table-cell">
                    {inv.balanceDue > 0 && inv.status !== 'cancelled' && (
                      <button onClick={() => setPaymentModal(inv._id)} className="btn-secondary text-xs px-2 py-1 flex items-center gap-1">
                        <Wallet className="w-3 h-3" />{t('Record Payment', 'تسجيل دفعة')}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('Recent Goods Receipts', 'آخر سندات الاستلام')}</h2>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t(`${receipts.length} receipts`, `${receipts.length} سند`)}</span>
        </div>
        <table className="w-full">
          <thead style={{ borderBottom: '1px solid var(--border-color)' }}>
            <tr>
              <th className="table-header text-left">{t('GRN #', 'رقم السند')}</th>
              <th className="table-header text-left">{t('PO #', 'رقم الأمر')}</th>
              <th className="table-header text-left">{t('Vendor', 'المورد')}</th>
              <th className="table-header text-left">{t('Received', 'تاريخ الاستلام')}</th>
              <th className="table-header text-right">{t('Lines', 'البنود')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>{t('Loading…', 'جاري التحميل…')}</td></tr>
            ) : receipts.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>{t('No goods receipts yet', 'لا توجد سندات استلام بعد')}</td></tr>
            ) : receipts.slice(0, 10).map(receipt => {
              const vendor = typeof receipt.vendorId === 'object' ? receipt.vendorId as IVendor : vendors.find(v => v._id === receipt.vendorId);
              const order = typeof receipt.purchaseOrderId === 'object' ? receipt.purchaseOrderId as IPurchaseOrder : orders.find(o => o._id === receipt.purchaseOrderId);
              return (
                <tr key={receipt._id} className="table-row">
                  <td className="table-cell font-mono text-sm text-cyan-400">{receipt.grnNumber}</td>
                  <td className="table-cell font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{order?.poNumber || '—'}</td>
                  <td className="table-cell" style={{ color: 'var(--text-primary)' }}>{vendor?.name || '—'}</td>
                  <td className="table-cell" style={{ color: 'var(--text-muted)' }}>{formatDate(receipt.receivedDate)}</td>
                  <td className="table-cell text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{receipt.lines.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* New PO Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box max-w-2xl mx-4 p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('New Purchase Order', 'أمر شراء جديد')}</h2>
              <button onClick={() => setModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Vendor', 'المورد')}</label>
                <select value={form.vendorId} onChange={e => setForm(f => ({...f, vendorId: e.target.value}))} className="input-field">
                  <option value="">{t('Select vendor…', 'اختر المورد…')}</option>
                  {vendors.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Expected Delivery', 'تاريخ التسليم')}</label>
                <input type="date" value={form.expectedDelivery} onChange={e => setForm(f => ({...f, expectedDelivery: e.target.value}))} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Notes', 'ملاحظات')}</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="input-field" />
              </div>
            </div>

            {/* Add line */}
            <div className="card p-3 mb-3">
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>{t('Add Line Item', 'إضافة بند')}</p>
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-2">
                  <select value={newLine.productId} onChange={e => setNewLine(l => ({...l, productId: e.target.value}))} className="input-field text-xs">
                    <option value="">{t('Product…', 'منتج…')}</option>
                    {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <input type="number" placeholder={t('Qty', 'الكمية')} value={newLine.qty} onChange={e => setNewLine(l => ({...l, qty: Number(e.target.value)}))} className="input-field text-xs" />
                <input type="number" placeholder={t('Unit Cost', 'تكلفة الوحدة')} value={newLine.unitCost || ''} onChange={e => setNewLine(l => ({...l, unitCost: Number(e.target.value)}))} className="input-field text-xs" />
              </div>
              <button onClick={addLine} className="btn-secondary text-xs mt-2">{t('+ Add', '+ إضافة')}</button>
            </div>

            {/* Lines */}
            {form.lines.length > 0 && (
              <div className="space-y-1 mb-4">
                {form.lines.map((line, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg text-sm" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{line.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{line.qty} × SAR {line.unitCost.toFixed(2)}</span>
                    <span className="text-emerald-400 font-semibold">SAR {line.lineTotal.toFixed(2)}</span>
                    <button onClick={() => setForm(f => ({...f, lines: f.lines.filter((_, j) => j !== i)}))} style={{ color: 'var(--text-muted)' }} className="hover:text-red-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between pt-2 text-sm font-semibold" style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  <span>{t('Grand Total', 'الإجمالي الكلي')}</span>
                  <span className="text-emerald-400">
                    SAR {form.lines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">{t('Cancel', 'إلغاء')}</button>
              <button onClick={savePO} disabled={saving} className="btn-primary flex-1">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('Create PO', 'إنشاء أمر')}
              </button>
            </div>
          </div>
        </div>
      )}

      {invoiceModal && selectedOrder && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setInvoiceModal(null)}>
          <div className="modal-box max-w-xl mx-4 p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('Create Supplier Bill', 'إنشاء فاتورة مورد')}</h2>
              <button onClick={() => setInvoiceModal(null)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-3 rounded-xl mb-4" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedOrder.poNumber}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('This bill will be created from the selected purchase order.', 'سيتم إنشاء هذه الفاتورة من أمر الشراء المحدد.')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Supplier Ref #', 'مرجع المورد')}</label>
                <input className="input-field" value={invoiceForm.supplierReference} onChange={e => setInvoiceForm(f => ({ ...f, supplierReference: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Invoice Date', 'تاريخ الفاتورة')}</label>
                <input type="date" className="input-field" value={invoiceForm.invoiceDate} onChange={e => setInvoiceForm(f => ({ ...f, invoiceDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Due Date', 'تاريخ الاستحقاق')}</label>
                <input type="date" className="input-field" value={invoiceForm.dueDate} onChange={e => setInvoiceForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Initial Payment', 'دفعة أولية')}</label>
                <input type="number" min={0} className="input-field" value={invoiceForm.paidAmount} onChange={e => setInvoiceForm(f => ({ ...f, paidAmount: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Notes', 'ملاحظات')}</label>
                <input className="input-field" value={invoiceForm.notes} onChange={e => setInvoiceForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="p-3 rounded-xl mb-4" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}>
              <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>{t('Bill Total', 'إجمالي الفاتورة')}</span><span style={{ color: 'var(--text-primary)' }}>SAR {selectedOrder.grandTotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm mt-1"><span style={{ color: 'var(--text-secondary)' }}>{t('Outstanding After Create', 'المتبقي بعد الإنشاء')}</span><span style={{ color: '#f97316' }}>SAR {Math.max(0, selectedOrder.grandTotal - Number(invoiceForm.paidAmount || 0)).toFixed(2)}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setInvoiceModal(null)} className="btn-secondary flex-1">{t('Cancel', 'إلغاء')}</button>
              <button onClick={saveSupplierInvoice} disabled={saving} className="btn-primary flex-1">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('Create Bill', 'إنشاء الفاتورة')}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentModal && selectedInvoice && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPaymentModal(null)}>
          <div className="modal-box max-w-lg mx-4 p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('Record Supplier Payment', 'تسجيل دفعة مورد')}</h2>
              <button onClick={() => setPaymentModal(null)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-3 rounded-xl mb-4" style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-color)' }}>
              <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>{selectedInvoice.invoiceNumber}</span><span style={{ color: 'var(--text-primary)' }}>SAR {selectedInvoice.balanceDue.toFixed(2)}</span></div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t('Remaining payable balance', 'الرصيد المستحق المتبقي')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Amount', 'المبلغ')}</label>
                <input type="number" min={0} className="input-field" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Method', 'الطريقة')}</label>
                <select className="input-field" value={paymentForm.method} onChange={e => setPaymentForm(f => ({ ...f, method: e.target.value }))}>
                  {['bank_transfer','cash','card','cheque','other'].map(m => <option key={m} value={m}>{m.replace('_',' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Reference', 'المرجع')}</label>
                <input className="input-field" value={paymentForm.reference} onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{t('Note', 'ملاحظة')}</label>
                <input className="input-field" value={paymentForm.note} onChange={e => setPaymentForm(f => ({ ...f, note: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPaymentModal(null)} className="btn-secondary flex-1">{t('Cancel', 'إلغاء')}</button>
              <button onClick={recordPayment} disabled={saving} className="btn-primary flex-1">
                {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('Save Payment', 'حفظ الدفعة')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Confirm Modal */}
      {receiveModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setReceiveModal(null)}>
          <div className="modal-box max-w-sm mx-4 p-6 text-center animate-fade-in">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t('Mark as Received?', 'تأكيد الاستلام؟')}</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>{t('This will create inventory batches for all line items.', 'سيتم إنشاء دفعات مخزون لجميع البنود.')}</p>
            <div className="flex gap-3">
              <button onClick={() => setReceiveModal(null)} className="btn-secondary flex-1">{t('Cancel', 'إلغاء')}</button>
              <button onClick={() => receivePO(receiveModal)} className="btn-primary flex-1">{t('Confirm', 'تأكيد')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
