import mongoose, { Schema, Document } from 'mongoose';

export interface IPromotionDoc extends Document {
  code: string;
  name: string;
  nameAr: string;
  type: 'percentage' | 'fixed' | 'bogo' | 'bundle' | 'loyalty';
  value: number;
  minPurchase: number;
  maxDiscount?: number;
  productIds: mongoose.Types.ObjectId[];
  categoryIds: string[];
  usageLimit?: number;
  usedCount: number;
  loyaltyPointsCost?: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  branchId: mongoose.Types.ObjectId;
}

const PromotionSchema = new Schema<IPromotionDoc>({
  code:               { type: String, required: true, unique: true },
  name:               { type: String, required: true },
  nameAr:             { type: String, default: '' },
  type:               { type: String, enum: ['percentage','fixed','bogo','bundle','loyalty'], required: true },
  value:              { type: Number, required: true },
  minPurchase:        { type: Number, default: 0 },
  maxDiscount:        { type: Number },
  productIds:         [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  categoryIds:        [{ type: String }],
  usageLimit:         { type: Number },
  usedCount:          { type: Number, default: 0 },
  loyaltyPointsCost:  { type: Number },
  startDate:          { type: Date, required: true },
  endDate:            { type: Date, required: true },
  isActive:           { type: Boolean, default: true },
  branchId:           { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
}, { timestamps: true });

export default mongoose.models.Promotion || mongoose.model<IPromotionDoc>('Promotion', PromotionSchema);
