import mongoose, { Schema, Document, Model } from 'mongoose';

const POLineSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  qty: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  unitCost: { type: Number, required: true, min: 0 },
  vatRate: { type: Number, default: 0.15 },
  vatAmount: { type: Number, required: true },
  lineTotal: { type: Number, required: true },
}, { _id: false });

export interface IPurchaseOrderDocument extends Document {
  poNumber: string;
  vendorId: mongoose.Types.ObjectId;
  lines: mongoose.Types.Array<{
    productId: mongoose.Types.ObjectId;
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
  landedCostFactor: number;
  grandTotal: number;
  status: 'draft' | 'sent' | 'received' | 'partial' | 'cancelled';
  expectedDelivery?: Date;
  receivedDate?: Date;
  branchId: mongoose.Types.ObjectId;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
}

const PurchaseOrderSchema = new Schema<IPurchaseOrderDocument>(
  {
    poNumber: { type: String, required: true, unique: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    lines: { type: [POLineSchema], required: true },
    subtotal: { type: Number, required: true },
    vatTotal: { type: Number, required: true },
    landedCostFactor: { type: Number, default: 1 },
    grandTotal: { type: Number, required: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'received', 'partial', 'cancelled'],
      default: 'draft',
    },
    expectedDelivery: { type: Date },
    receivedDate: { type: Date },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

PurchaseOrderSchema.index({ vendorId: 1 });
PurchaseOrderSchema.index({ branchId: 1, createdAt: -1 });
PurchaseOrderSchema.index({ status: 1 });

const PurchaseOrder: Model<IPurchaseOrderDocument> =
  mongoose.models.PurchaseOrder ||
  mongoose.model<IPurchaseOrderDocument>('PurchaseOrder', PurchaseOrderSchema);

export default PurchaseOrder;
