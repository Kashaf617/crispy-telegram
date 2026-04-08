import mongoose, { Schema, Document, Model } from 'mongoose';

const GoodsReceiptLineSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  qty: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  unitCost: { type: Number, required: true, min: 0 },
  vatRate: { type: Number, default: 0.15 },
  vatAmount: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 },
  batchNumber: { type: String, trim: true },
  expiryDate: { type: Date },
}, { _id: false });

export interface IGoodsReceiptDocument extends Document {
  grnNumber: string;
  purchaseOrderId: mongoose.Types.ObjectId;
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
    batchNumber?: string;
    expiryDate?: Date;
  }>;
  receivedDate: Date;
  notes?: string;
  branchId: mongoose.Types.ObjectId;
  receivedBy: mongoose.Types.ObjectId;
}

const GoodsReceiptSchema = new Schema<IGoodsReceiptDocument>(
  {
    grnNumber: { type: String, required: true, unique: true, trim: true },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    lines: { type: [GoodsReceiptLineSchema], default: [] },
    receivedDate: { type: Date, default: Date.now },
    notes: { type: String },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

GoodsReceiptSchema.index({ purchaseOrderId: 1 });
GoodsReceiptSchema.index({ vendorId: 1, receivedDate: -1 });
GoodsReceiptSchema.index({ branchId: 1, receivedDate: -1 });

const GoodsReceipt: Model<IGoodsReceiptDocument> =
  mongoose.models.GoodsReceipt || mongoose.model<IGoodsReceiptDocument>('GoodsReceipt', GoodsReceiptSchema);

export default GoodsReceipt;
