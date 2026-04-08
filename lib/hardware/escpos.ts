/**
 * ESC/POS command builder for thermal receipt printers.
 * Works with USB, Serial, and Network printers that support
 * the ESC/POS protocol (Epson, Star, Citizen, etc.)
 */

export const ESC  = 0x1b;
export const GS   = 0x1d;
export const FS   = 0x1c;
export const DLE  = 0x10;
export const NUL  = 0x00;

export class EscPos {
  private buf: number[] = [];

  private push(...bytes: number[]) { this.buf.push(...bytes); return this; }
  private pushStr(s: string)       { for (const c of s) this.buf.push(c.charCodeAt(0)); return this; }

  /** Full reset */
  init()          { return this.push(ESC, 0x40); }

  /** Line feed */
  lf(n = 1)       { for (let i = 0; i < n; i++) this.push(0x0a); return this; }

  /** Cut paper */
  cut(full = false) { return this.push(GS, 0x56, full ? 0x00 : 0x01); }

  /** Open cash drawer (pin 2 or pin 5) */
  openDrawer(pin: 2 | 5 = 2) {
    return this.push(ESC, 0x70, pin === 2 ? 0x00 : 0x01, 0x19, 0xff);
  }

  /** Set alignment: 0=left, 1=center, 2=right */
  align(a: 0 | 1 | 2) { return this.push(ESC, 0x61, a); }

  /** Bold on/off */
  bold(on = true) { return this.push(ESC, 0x45, on ? 1 : 0); }

  /** Underline on/off */
  underline(on = true) { return this.push(ESC, 0x2d, on ? 1 : 0); }

  /** Double height / width */
  doubleSize(on = true) { return this.push(GS, 0x21, on ? 0x11 : 0x00); }

  /** Font size multiplier (1–8) */
  fontSize(w: 1|2|3|4, h: 1|2|3|4) {
    return this.push(GS, 0x21, ((w - 1) << 4) | (h - 1));
  }

  /** Print text */
  text(s: string) { return this.pushStr(s); }

  /** Print text + LF */
  textLn(s: string) { return this.pushStr(s).lf(); }

  /** Print a horizontal divider */
  divider(len = 32, char = '-') {
    return this.textLn(char.repeat(len));
  }

  /** Print two columns (left-aligned + right-aligned) */
  columns(left: string, right: string, width = 32) {
    const pad = width - left.length - right.length;
    return this.textLn(left + ' '.repeat(Math.max(1, pad)) + right);
  }

  /** Barcode – CODE128 */
  barcode128(data: string) {
    return this
      .push(GS, 0x68, 0x50)   // height 80 dots
      .push(GS, 0x77, 0x02)   // width 2
      .push(GS, 0x48, 0x02)   // HRI below
      .push(GS, 0x6b, 0x49, data.length + 2, 0x7b, 0x42)
      .pushStr(data);
  }

  /** QR code */
  qrCode(data: string, size = 6) {
    const bytes = [...data].map(c => c.charCodeAt(0));
    const pL = (bytes.length + 3) & 0xff;
    const pH = ((bytes.length + 3) >> 8) & 0xff;
    return this
      .push(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00)   // model 2
      .push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size)          // cell size
      .push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30)          // error L
      .push(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...bytes)    // store data
      .push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);         // print
  }

  /** Return the final byte array */
  build(): Uint8Array { return new Uint8Array(this.buf); }

  /** Return as base64 string (for API transport) */
  toBase64(): string {
    return btoa(String.fromCharCode(...this.buf));
  }
}

// ── Receipt builder helpers ─────────────────────────────────────────────────

export interface ReceiptLine {
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
  discount: number;
  vatAmount: number;
  lineTotal: number;
}

export interface ReceiptData {
  storeName:     string;
  storeNameAr:   string;
  vatNumber:     string;
  address:       string;
  invoiceNumber: string;
  cashierName:   string;
  branchName:    string;
  date:          string;
  lines:         ReceiptLine[];
  subtotal:      number;
  discountTotal: number;
  vatTotal:      number;
  grandTotal:    number;
  payments:      { method: string; amount: number }[];
  change:        number;
  customerName?: string;
  zatcaQR?:      string;
  paperWidth:    58 | 80;
}

export function buildReceipt(data: ReceiptData): Uint8Array {
  const W = data.paperWidth === 80 ? 48 : 32;
  const e = new EscPos().init();

  e.align(1).bold(true).doubleSize(true).textLn('SaudiMart').doubleSize(false);
  e.textLn(data.storeNameAr).bold(false);
  e.textLn(data.branchName).textLn(data.address);
  e.textLn(`VAT: ${data.vatNumber}`);
  e.align(0).divider(W);

  e.columns(`Invoice: ${data.invoiceNumber}`, data.date, W);
  e.columns(`Cashier: ${data.cashierName}`,   '',        W);
  if (data.customerName) e.textLn(`Customer: ${data.customerName}`);
  e.divider(W);

  data.lines.forEach(l => {
    e.textLn(`${l.name}`);
    e.columns(
      `  ${l.qty} ${l.unit} x SAR ${l.unitPrice.toFixed(2)}`,
      `SAR ${l.lineTotal.toFixed(2)}`,
      W,
    );
    if (l.discount > 0) e.columns('  Discount', `-SAR ${l.discount.toFixed(2)}`, W);
  });

  e.divider(W);
  e.columns('Subtotal',       `SAR ${data.subtotal.toFixed(2)}`,      W);
  if (data.discountTotal > 0)
    e.columns('Discount',     `-SAR ${data.discountTotal.toFixed(2)}`, W);
  e.columns('VAT (15%)',      `SAR ${data.vatTotal.toFixed(2)}`,       W);
  e.bold(true).columns('TOTAL', `SAR ${data.grandTotal.toFixed(2)}`,   W).bold(false);
  e.divider(W);

  data.payments.forEach(p => e.columns(p.method.toUpperCase(), `SAR ${p.amount.toFixed(2)}`, W));
  if (data.change > 0) e.columns('Change', `SAR ${data.change.toFixed(2)}`, W);
  e.divider(W);

  e.align(1).textLn('Thank you for shopping!').textLn('شكرا لتسوقكم معنا');
  if (data.zatcaQR) e.lf().qrCode(data.zatcaQR, 4);
  e.lf(3).cut();

  return e.build();
}
