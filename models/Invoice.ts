import mongoose, { Schema, Document, Model } from 'mongoose';

const InvoiceLineSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
  name: { type: String, required: true },
  nameAr: { type: String, required: true },
  qty: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  vatRate: { type: Number, default: 0.15 },
  vatAmount: { type: Number, required: true },
  lineTotal: { type: Number, required: true },
}, { _id: false });

const PaymentSchema = new Schema({
  method: { type: String, enum: ['cash', 'card', 'loyalty', 'credit'], required: true },
  amount: { type: Number, required: true },
  reference: { type: String },
}, { _id: false });

export interface IInvoiceDocument extends Document {
  invoiceNumber: string;
  type: 'sale' | 'return' | 'purchase';
  customerId?: mongoose.Types.ObjectId;
  customerName?: string;
  customerVatNumber?: string;
  lines: mongoose.Types.Array<{
    productId: mongoose.Types.ObjectId;
    batchId?: mongoose.Types.ObjectId;
    name: string;
    nameAr: string;
    qty: number;
    unit: string;
    unitPrice: number;
    discount: number;
    vatRate: number;
    vatAmount: number;
    lineTotal: number;
  }>;
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  grandTotal: number;
  payments: mongoose.Types.Array<{ method: string; amount: number; reference?: string }>;
  change: number;
  status: 'draft' | 'paid' | 'held' | 'cancelled' | 'returned';
  zatcaQR?: string;
  zatcaHash?: string;
  cashierId: mongoose.Types.ObjectId;
  cashierName?: string;
  promotionCode?: string;
  branchId: mongoose.Types.ObjectId;
  notes?: string;
}

const InvoiceSchema = new Schema<IInvoiceDocument>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    type: { type: String, enum: ['sale', 'return', 'purchase'], default: 'sale' },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String },
    customerVatNumber: { type: String },
    lines: { type: [InvoiceLineSchema], required: true },
    subtotal: { type: Number, required: true },
    discountTotal: { type: Number, default: 0 },
    vatTotal: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
    payments: { type: [PaymentSchema], default: [] },
    change: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'paid', 'held', 'cancelled', 'returned'], default: 'draft' },
    zatcaQR: { type: String },
    zatcaHash: { type: String },
    cashierId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cashierName: { type: String },
    promotionCode: { type: String },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

InvoiceSchema.index({ branchId: 1, createdAt: -1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ cashierId: 1 });

const Invoice: Model<IInvoiceDocument> =
  mongoose.models.Invoice || mongoose.model<IInvoiceDocument>('Invoice', InvoiceSchema);

export default Invoice;
