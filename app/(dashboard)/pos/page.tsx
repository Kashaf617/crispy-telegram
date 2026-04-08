'use client';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Plus, Minus, CreditCard, ShoppingBag,
  Printer, PauseCircle, PlayCircle, RotateCcw, Scale, X, Check,
  Scan, UserCircle, Tag, Cpu,
} from 'lucide-react';
import { useLang } from '@/contexts/LanguageContext';
import { generateInvoiceNumber } from '@/lib/utils';
import { useBarcodeScanner, useHardwareSettings, printReceiptBrowser } from '@/hooks/useHardware';
import type { IProduct, CartItem, HeldBill, IPayment, ICustomer, IPromotion } from '@/types';

const VAT_RATE = 0.15;

function calcLine(item: CartItem) {
  const base = item.qty * item.unitPrice * (1 - item.discount / 100);
  const vat = base * VAT_RATE;
  return { base, vat, total: base + vat };
}

export default function POSPage() {
  const { t } = useLang();
  const { settings: hwSettings } = useHardwareSettings();
  const [products, setProducts] = useState<IProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId]     = useState('');
  const [customerPoints, setCustomerPoints] = useState(0);
  const [promoCode, setPromoCode]       = useState('');
  const [appliedPromo, setAppliedPromo] = useState<IPromotion | null>(null);
  const [promoError, setPromoError]     = useState('');
  const [paymentModal, setPaymentModal] = useState(false);
  const [cashTendered, setCashTendered] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'card' | 'split' | 'loyalty'>('cash');
  const [processing, setProcessing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<{ invoiceNumber: string; zatcaQR: string; grandTotal: number } | null>(null);
  const [weightMode, setWeightMode] = useState(false);
  const [liveWeight] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const addToCart = useCallback((product: IProduct) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.productId === product._id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 };
        return updated;
      }
      return [...prev, {
        productId: product._id,
        name: product.name,
        nameAr: product.nameAr,
        sku: product.sku,
        qty: 1,
        unit: product.unit,
        unitPrice: product.sellPrice,
        discount: 0,
        vatRate: product.vatRate,
        isWeighed: product.isWeighed,
      }];
    });
  }, []);

  const fetchProducts = useCallback(async (q = '') => {
    const res = await fetch(`/api/products?search=${q}&limit=200`);
    if (res.ok) { const d = await res.json(); setProducts(d.products); }
  }, []);

  useBarcodeScanner(
    useCallback((code: string) => {
      const p = products.find(pr => pr.barcode === code || pr.sku === code);
      if (p) { addToCart(p); setSearch(''); }
      else setSearch(code);
    }, [addToCart, products]),
    { enabled: hwSettings.barcodeScanner.enabled, minLength: hwSettings.barcodeScanner.minLength },
  );

  const subtotal = cart.reduce((s, i) => s + calcLine(i).base, 0);
  const vatTotal  = cart.reduce((s, i) => s + calcLine(i).vat, 0);
  const promoDiscount = appliedPromo
    ? appliedPromo.type === 'percentage'
      ? Math.min(subtotal * appliedPromo.value / 100, appliedPromo.maxDiscount ?? Infinity)
      : appliedPromo.type === 'fixed' ? appliedPromo.value : 0
    : 0;
  const grandTotal = Math.max(0, subtotal - promoDiscount + vatTotal);
  const change = Math.max(0, parseFloat(cashTendered || '0') - grandTotal);

  useEffect(() => { void fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    const timer = setTimeout(() => { void fetchProducts(search); }, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts, search]);

  function updateQty(idx: number, delta: number) {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[idx].qty + delta;
      if (newQty <= 0) { updated.splice(idx, 1); return updated; }
      updated[idx] = { ...updated[idx], qty: newQty };
      return updated;
    });
  }

  function removeItem(idx: number) {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  }

  async function applyPromo() {
    if (!promoCode.trim()) return;
    setPromoError('');
    const res = await fetch('/api/promotions?active=true');
    if (!res.ok) { setPromoError('Error fetching promotions'); return; }
    const d = await res.json();
    const promo = (d.promotions as IPromotion[]).find(
      p => p.code.toLowerCase() === promoCode.trim().toLowerCase()
    );
    if (!promo)  { setPromoError(t('Invalid promo code', 'كود العرض غير صحيح')); return; }
    if (subtotal < promo.minPurchase) {
      setPromoError(`${t('Min purchase:', 'الحد الأدنى:')} SAR ${promo.minPurchase}`);
      return;
    }
    setAppliedPromo(promo);
    setPromoError('');
  }

  async function lookupCustomer(phone: string) {
    const res = await fetch(`/api/customers?search=${encodeURIComponent(phone)}`);
    if (res.ok) {
      const d = await res.json();
      const found = (d.customers as ICustomer[]).find(c => c.phone === phone);
      if (found) { setCustomerName(found.name); setCustomerId(found._id); setCustomerPoints(found.loyaltyPoints); }
    }
  }

  function holdBill() {
    if (cart.length === 0) return;
    const id = `HOLD-${Date.now()}`;
    setHeldBills((prev) => [...prev, { id, label: customerName || id, items: [...cart], customerName, heldAt: new Date() }]);
    setCart([]);
    setCustomerName('');
    setAppliedPromo(null);
    setPromoCode('');
  }

  function resumeBill(bill: HeldBill) {
    setCart(bill.items);
    setCustomerName(bill.customerName || '');
    setHeldBills((prev) => prev.filter((b) => b.id !== bill.id));
  }

  async function checkout() {
    if (cart.length === 0 || processing) return;
    setProcessing(true);
    try {
      const stored = sessionStorage.getItem('saudimart_user');
      const user = stored ? JSON.parse(stored) : null;
      const payments: IPayment[] = payMethod === 'cash'
        ? [{ method: 'cash', amount: grandTotal }]
        : payMethod === 'card'
        ? [{ method: 'card', amount: grandTotal }]
        : payMethod === 'loyalty'
        ? [{ method: 'loyalty', amount: grandTotal }]
        : [
            { method: 'cash', amount: parseFloat(cashTendered || '0') },
            { method: 'card', amount: Math.max(0, grandTotal - parseFloat(cashTendered || '0')) },
          ];

      const body = {
        invoiceNumber: generateInvoiceNumber('INV'),
        type: 'sale',
        customerName,
        customerId: customerId || undefined,
        lines: cart.map((item) => ({
          productId: item.productId,
          name: item.name,
          nameAr: item.nameAr,
          qty: item.qty,
          unit: item.unit,
          unitPrice: item.unitPrice,
          discount: item.discount,
          vatRate: VAT_RATE,
          vatAmount: calcLine(item).vat,
          lineTotal: calcLine(item).total,
        })),
        subtotal: parseFloat(subtotal.toFixed(2)),
        discountTotal: parseFloat(promoDiscount.toFixed(2)),
        vatTotal: parseFloat(vatTotal.toFixed(2)),
        grandTotal: parseFloat(grandTotal.toFixed(2)),
        payments,
        change: parseFloat(change.toFixed(2)),
        status: 'paid',
        branchId: user?.branchId || '000000000000000000000001',
        promotionCode: appliedPromo?.code,
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setLastReceipt({ invoiceNumber: data.invoice.invoiceNumber, zatcaQR: data.invoice.zatcaQR, grandTotal });
        if (hwSettings.receiptPrinter.enabled) {
          const receiptHtml = buildReceiptHtml(data.invoice, payments, cart);
          printReceiptBrowser(receiptHtml);
        }
        setCart([]);
        setCustomerName('');
        setCustomerId('');
        setCustomerPoints(0);
        setAppliedPromo(null);
        setPromoCode('');
        setPaymentModal(false);
        setCashTendered('');
      }
    } catch (err) { console.error(err); }
    finally { setProcessing(false); }
  }

  function buildReceiptHtml(invoice: { invoiceNumber: string; zatcaQR?: string }, payments: IPayment[], items: CartItem[]) {
    const lines = items.map(i => {
      const { total } = calcLine(i);
      return `<tr><td>${i.name}</td><td>${i.qty} ${i.unit} x ${i.unitPrice.toFixed(2)}</td><td class="right">SAR ${total.toFixed(2)}</td></tr>`;
    }).join('');
    const payRows = payments.map(p => `<tr><td>${p.method.toUpperCase()}</td><td></td><td class="right">SAR ${p.amount.toFixed(2)}</td></tr>`).join('');
    return `<div class="center bold">SaudiMart ERP</div>
<div class="center">Invoice: ${invoice.invoiceNumber}</div>
<div class="divider"></div>
<table>${lines}</table>
<div class="divider"></div>
<table>
  <tr><td>Subtotal</td><td></td><td class="right">SAR ${subtotal.toFixed(2)}</td></tr>
  ${promoDiscount > 0 ? `<tr><td>Discount</td><td></td><td class="right">-SAR ${promoDiscount.toFixed(2)}</td></tr>` : ''}
  <tr><td>VAT 15%</td><td></td><td class="right">SAR ${vatTotal.toFixed(2)}</td></tr>
  <tr><td class="bold">TOTAL</td><td></td><td class="right bold">SAR ${grandTotal.toFixed(2)}</td></tr>
</table>
<div class="divider"></div>
<table>${payRows}</table>
${change > 0 ? `<div>Change: SAR ${change.toFixed(2)}</div>` : ''}
<div class="divider"></div>
<div class="center">Thank you!</div>`;
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.nameAr.includes(search) ||
    p.barcode.includes(search) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('POS Billing', 'نقطة البيع')}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {hwSettings.barcodeScanner.enabled && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#10b98115', color: '#10b981' }}>
                <Scan className="w-2.5 h-2.5" />{t('Scanner active','الماسح نشط')}
              </span>
            )}
            {hwSettings.receiptPrinter.enabled && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#3b82f615', color: '#3b82f6' }}>
                <Printer className="w-2.5 h-2.5" />{t('Printer ready','الطابعة جاهزة')}
              </span>
            )}
            {hwSettings.weighingScale.enabled && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#a855f715', color: '#a855f7' }}>
                <Cpu className="w-2.5 h-2.5" />{t('Scale ready','الميزان جاهز')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeightMode(!weightMode)}
            className={`btn-secondary flex items-center gap-2 text-sm ${weightMode ? 'border-emerald-500/50 text-emerald-400' : ''}`}
          >
            <Scale className="w-4 h-4" />
            {weightMode ? (liveWeight !== null ? `${liveWeight.toFixed(3)} kg` : t('Tare…', 'وزن…')) : t('Scale', 'الميزان')}
          </button>
          {heldBills.length > 0 && (
            <div className="flex gap-1">
              {heldBills.map((b) => (
                <button key={b.id} onClick={() => resumeBill(b)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-xs">
                  <PlayCircle className="w-3 h-3" />
                  {b.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: product search */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Search by name, barcode, SKU…', 'ابحث بالاسم أو الباركود أو الرمز…')}
              className="input-field pl-9"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 overflow-y-auto flex-1 content-start">
            {filteredProducts.map((p) => (
              <button
                key={p._id}
                onClick={() => addToCart(p)}
                className="card p-3 text-left hover:border-emerald-500/30 transition-all active:scale-95 cursor-pointer"
              >
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{p.nameAr}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-emerald-400 font-semibold text-sm">SAR {p.sellPrice.toFixed(2)}</span>
                  <span className="badge badge-slate text-xs">{p.unit}</span>
                </div>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
                {t('No products found', 'لا توجد منتجات')}
              </div>
            )}
          </div>
        </div>

        {/* Right: cart */}
        <div className="w-80 flex flex-col gap-3">
          {/* Customer lookup */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onBlur={e => { if (e.target.value.match(/^05\d{8}$/)) lookupCustomer(e.target.value); }}
                placeholder={t('Customer / phone', 'العميل / الهاتف')}
                className="input-field text-sm pl-9"
              />
            </div>
            {customerId && <span className="flex items-center text-xs px-2 rounded-lg" style={{ background: '#a855f715', color: '#a855f7' }}>{customerPoints}pts</span>}
          </div>
          {/* Promo code */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input value={promoCode} onChange={e => setPromoCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyPromo()}
                placeholder={t('Promo code', 'كود العرض')}
                className="input-field text-sm pl-9 font-mono uppercase"
              />
            </div>
            <button onClick={applyPromo} className="btn-secondary text-xs px-3">{t('Apply','تطبيق')}</button>
          </div>
          {promoError  && <p className="text-xs" style={{ color: '#ef4444' }}>{promoError}</p>}
          {appliedPromo && <div className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs" style={{ background: '#10b98115', border: '1px solid #10b98130' }}>
            <span style={{ color: '#10b981' }}>✓ {appliedPromo.name} (-SAR {promoDiscount.toFixed(2)})</span>
            <button onClick={() => { setAppliedPromo(null); setPromoCode(''); }} style={{ color: 'var(--text-muted)' }}><X className="w-3 h-3" /></button>
          </div>}

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
            {cart.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40" style={{ color: 'var(--text-muted)' }}>
                <ShoppingBag className="w-10 h-10 mb-2" />
                <p className="text-sm">{t('Cart is empty', 'السلة فارغة')}</p>
              </div>
            )}
            {cart.map((item, idx) => {
              const { total } = calcLine(item);
              return (
                <div key={idx} className="card p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.sku} • {item.unit}</p>
                    </div>
                    <button onClick={() => removeItem(idx)} style={{ color: 'var(--text-muted)' }} className="hover:text-red-400 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(idx, -1)} className="w-6 h-6 rounded flex items-center justify-center transition-colors" style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-10 text-center text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.qty}</span>
                      <button onClick={() => updateQty(idx, 1)} className="w-6 h-6 rounded flex items-center justify-center transition-colors" style={{ background: 'var(--bg-muted)', color: 'var(--text-secondary)' }}>
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-emerald-400 font-semibold text-sm">SAR {total.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="card p-3 space-y-1.5 text-sm">
            <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
              <span>{t('Subtotal', 'المجموع الفرعي')}</span>
              <span>SAR {subtotal.toFixed(2)}</span>
            </div>
            {promoDiscount > 0 && (
              <div className="flex justify-between" style={{ color: '#10b981' }}>
                <span>{t('Discount', 'الخصم')}</span>
                <span>-SAR {promoDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between" style={{ color: 'var(--text-secondary)' }}>
              <span>{t('VAT 15%', 'ضريبة القيمة المضافة 15%')}</span>
              <span>SAR {vatTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1.5" style={{ borderTop: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
              <span>{t('Total', 'الإجمالي')}</span>
              <span className="text-emerald-400">SAR {grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={holdBill} disabled={cart.length === 0} className="btn-secondary flex items-center justify-center gap-2 text-sm">
              <PauseCircle className="w-4 h-4" />
              {t('Hold', 'تعليق')}
            </button>
            <button onClick={() => setCart([])} disabled={cart.length === 0} className="btn-danger flex items-center justify-center gap-2 text-sm">
              <RotateCcw className="w-4 h-4" />
              {t('Clear', 'مسح')}
            </button>
          </div>
          <button
            onClick={() => setPaymentModal(true)}
            disabled={cart.length === 0}
            className="btn-primary flex items-center justify-center gap-2 h-12 text-base font-semibold"
          >
            <CreditCard className="w-5 h-5" />
            {t('Charge', 'الدفع')} SAR {grandTotal.toFixed(2)}
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPaymentModal(false)}>
          <div className="modal-box max-w-md mx-4 p-6 animate-fade-in">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('Payment', 'الدفع')} — SAR {grandTotal.toFixed(2)}</h2>

            {/* Method */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {(['cash', 'card', 'loyalty', 'split'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPayMethod(m)}
                  className="py-2 rounded-lg text-xs font-medium border transition-all"
                  style={{
                    background: payMethod === m ? '#10b98120' : 'var(--bg-muted)',
                    borderColor: payMethod === m ? '#10b98150' : 'var(--border-color)',
                    color: payMethod === m ? '#10b981' : 'var(--text-muted)',
                  }}
                >
                  {m === 'cash' ? t('Cash','نقدي') : m === 'card' ? t('Card','بطاقة') : m === 'loyalty' ? t('Loyalty','ولاء') : t('Split','مختلط')}
                </button>
              ))}
            </div>

            {payMethod === 'loyalty' && (
              <div className="mb-4 p-3 rounded-xl" style={{ background: '#a855f710', border: '1px solid #a855f730' }}>
                <p className="text-sm" style={{ color: '#a855f7' }}>
                  {customerId
                    ? `${t('Customer has','العميل لديه')} ${customerPoints} ${t('points','نقطة')} = SAR ${(customerPoints * 0.01).toFixed(2)}`
                    : t('No customer linked — add phone number first','لا يوجد عميل مرتبط — أضف رقم الهاتف أولاً')}
                </p>
              </div>
            )}

            {(payMethod === 'cash' || payMethod === 'split') && (
              <div className="mb-4">
                <label className="text-sm mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('Cash Tendered', 'المبلغ المدفوع')}</label>
                <input
                  type="number"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="input-field text-xl font-bold"
                  style={{ color: 'var(--text-primary)' }}
                  placeholder="0.00"
                />
                {parseFloat(cashTendered || '0') > 0 && (
                  <p className="text-sm text-emerald-400 mt-1">{t('Change:', 'الباقي:')} SAR {change.toFixed(2)}</p>
                )}
              </div>
            )}

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['7','8','9','4','5','6','1','2','3','.',  '0','⌫'].map((k) => (
                <button
                  key={k}
                  className="numpad-key"
                  onClick={() => {
                    if (k === '⌫') setCashTendered((p) => p.slice(0, -1));
                    else setCashTendered((p) => p + k);
                  }}
                >
                  {k}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setPaymentModal(false)} className="btn-secondary">
                {t('Cancel', 'إلغاء')}
              </button>
              <button onClick={checkout} disabled={processing} className="btn-primary flex items-center justify-center gap-2">
                {processing
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Check className="w-4 h-4" />{t('Confirm', 'تأكيد')}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {lastReceipt && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm mx-4 p-6 text-center animate-fade-in" style={{ border: '1px solid #10b98130' }}>
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{t('Payment Successful!', 'تم الدفع بنجاح!')}</h2>
            <p className="text-xl font-black text-emerald-400 mb-1">SAR {lastReceipt.grandTotal.toFixed(2)}</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{lastReceipt.invoiceNumber}</p>
            {lastReceipt.zatcaQR && (
              <Image src={lastReceipt.zatcaQR} alt="ZATCA QR" width={128} height={128} unoptimized className="mx-auto mb-4 rounded-lg bg-white p-1" />
            )}
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{t('ZATCA Phase 2 QR Code', 'رمز QR هيئة الزكاة والضريبة')}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  const html = buildReceiptHtml({ invoiceNumber: lastReceipt.invoiceNumber, zatcaQR: lastReceipt.zatcaQR }, [], cart);
                  printReceiptBrowser(html);
                }}
                className="btn-secondary flex items-center justify-center gap-2 text-sm">
                <Printer className="w-4 h-4" />
                {t('Print', 'طباعة')}
              </button>
              <button onClick={() => setLastReceipt(null)} className="btn-primary text-sm">
                {t('New Sale', 'بيع جديد')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
