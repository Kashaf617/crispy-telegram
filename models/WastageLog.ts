import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWastageLogDocument extends Document {
  productId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  quantity: number;
  unit: string;
  reason: 'expired' | 'damaged' | 'theft' | 'quality' | 'other';
  notes?: string;
  costLoss: number;
  recordedBy: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
}

const WastageLogSchema = new Schema<IWastageLogDocument>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    reason: { type: String, enum: ['expired', 'damaged', 'theft', 'quality', 'other'], required: true },
    notes: { type: String },
    costLoss: { type: Number, required: true, min: 0 },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  },
  { timestamps: true }
);

WastageLogSchema.index({ branchId: 1, createdAt: -1 });
WastageLogSchema.index({ productId: 1 });

const WastageLog: Model<IWastageLogDocument> =
  mongoose.models.WastageLog || mongoose.model<IWastageLogDocument>('WastageLog', WastageLogSchema);

export default WastageLog;
