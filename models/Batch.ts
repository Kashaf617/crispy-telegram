import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBatchDocument extends Document {
  productId: mongoose.Types.ObjectId;
  batchNumber: string;
  vendorId?: mongoose.Types.ObjectId;
  purchaseOrderId?: mongoose.Types.ObjectId;
  quantity: number;
  remainingQty: number;
  unit: string;
  costPrice: number;
  sellPrice: number;
  manufactureDate?: Date;
  expiryDate: Date;
  receivedDate: Date;
  status: 'active' | 'expired' | 'depleted' | 'quarantine';
  branchId: mongoose.Types.ObjectId;
}

const BatchSchema = new Schema<IBatchDocument>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    batchNumber: { type: String, required: true, trim: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    quantity: { type: Number, required: true, min: 0 },
    remainingQty: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    costPrice: { type: Number, required: true, min: 0 },
    sellPrice: { type: Number, required: true, min: 0 },
    manufactureDate: { type: Date },
    expiryDate: { type: Date, required: true },
    receivedDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['active', 'expired', 'depleted', 'quarantine'],
      default: 'active',
    },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  },
  { timestamps: true }
);

BatchSchema.index({ productId: 1, expiryDate: 1 });
BatchSchema.index({ branchId: 1 });
BatchSchema.index({ status: 1 });
BatchSchema.index({ expiryDate: 1 });

const Batch: Model<IBatchDocument> =
  mongoose.models.Batch || mongoose.model<IBatchDocument>('Batch', BatchSchema);

export default Batch;
