import QRCode from 'qrcode';

interface ZatcaQRData {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  invoiceTotal: string;
  vatTotal: string;
}

function tlvEncode(tag: number, value: string): Buffer {
  const valueBytes = Buffer.from(value, 'utf8');
  const tagBuf = Buffer.alloc(1);
  const lenBuf = Buffer.alloc(1);
  tagBuf.writeUInt8(tag, 0);
  lenBuf.writeUInt8(valueBytes.length, 0);
  return Buffer.concat([tagBuf, lenBuf, valueBytes]);
}

export function generateZatcaTLV(data: ZatcaQRData): string {
  const tlv1 = tlvEncode(1, data.sellerName);
  const tlv2 = tlvEncode(2, data.vatNumber);
  const tlv3 = tlvEncode(3, data.timestamp);
  const tlv4 = tlvEncode(4, data.invoiceTotal);
  const tlv5 = tlvEncode(5, data.vatTotal);
  const combined = Buffer.concat([tlv1, tlv2, tlv3, tlv4, tlv5]);
  return combined.toString('base64');
}

export async function generateZatcaQRCode(
  sellerName: string,
  vatNumber: string,
  invoiceTotal: number,
  vatTotal: number,
  timestamp?: Date
): Promise<{ tlv: string; qrDataUrl: string }> {
  const ts = (timestamp || new Date()).toISOString();
  const tlv = generateZatcaTLV({
    sellerName,
    vatNumber,
    timestamp: ts,
    invoiceTotal: invoiceTotal.toFixed(2),
    vatTotal: vatTotal.toFixed(2),
  });

  const qrDataUrl = await QRCode.toDataURL(tlv, {
    errorCorrectionLevel: 'M',
    width: 200,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  return { tlv, qrDataUrl };
}

export function calculateVAT(subtotal: number, vatRate = 0.15): { vatAmount: number; total: number } {
  const vatAmount = parseFloat((subtotal * vatRate).toFixed(2));
  const total = parseFloat((subtotal + vatAmount).toFixed(2));
  return { vatAmount, total };
}

export function formatSARAmount(amount: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
  }).format(amount);
}
