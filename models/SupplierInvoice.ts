import mongoose, { Schema, Document, Model } from 'mongoose';

const SupplierInvoiceLineSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true },
  qty: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  unitCost: { type: Number, required: true, min: 0 },
  vatRate: { type: Number, default: 0.15 },
  vatAmount: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const SupplierPaymentSchema = new Schema({
  amount: { type: Number, required: true, min: 0.01 },
  method: {
    type: String,
    enum: ['cash', 'bank_transfer', 'card', 'cheque', 'other'],
    default: 'bank_transfer',
  },
  reference: { type: String, trim: true },
  note: { type: String, trim: true },
  paidAt: { type: Date, default: Date.now },
}, { _id: false });

export interface ISupplierInvoiceDocument extends Document {
  invoiceNumber: string;
  vendorId: mongoose.Types.ObjectId;
  purchaseOrderId?: mongoose.Types.ObjectId;
  supplierReference?: string;
  invoiceDate: Date;
  dueDate: Date;
  lines: mongoose.Types.Array<{
    productId?: mongoose.Types.ObjectId;
    name: string;
    qty: number;
    unit: string;
    unitCost: number;
    vatRate: number;
    vatAmount: number;
    lineTotal: number;
  }>;
  subtotal: number;
  vatTotal: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  status: 'draft' | 'posted' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  payments: mongoose.Types.Array<{
    amount: number;
    method: 'cash' | 'bank_transfer' | 'card' | 'cheque' | 'other';
    reference?: string;
    note?: string;
    paidAt: Date;
  }>;
  notes?: string;
  branchId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
}

const SupplierInvoiceSchema = new Schema<ISupplierInvoiceDocument>(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    supplierReference: { type: String, trim: true },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    lines: { type: [SupplierInvoiceLineSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    vatTotal: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['draft', 'posted', 'partial', 'paid', 'overdue', 'cancelled'],
      default: 'posted',
    },
    payments: { type: [SupplierPaymentSchema], default: [] },
    notes: { type: String },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

SupplierInvoiceSchema.index({ vendorId: 1, createdAt: -1 });
SupplierInvoiceSchema.index({ purchaseOrderId: 1 });
SupplierInvoiceSchema.index({ status: 1, dueDate: 1 });
SupplierInvoiceSchema.index({ branchId: 1, status: 1 });

const SupplierInvoice: Model<ISupplierInvoiceDocument> =
  mongoose.models.SupplierInvoice ||
  mongoose.model<ISupplierInvoiceDocument>('SupplierInvoice', SupplierInvoiceSchema);

export default SupplierInvoice;
