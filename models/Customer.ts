import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomerDoc extends Document {
  customerCode: string;
  name: string;
  nameAr: string;
  phone: string;
  email?: string;
  vatNumber?: string;
  loyaltyPoints: number;
  totalSpent: number;
  visitCount: number;
  segment: 'bronze' | 'silver' | 'gold' | 'platinum';
  notes?: string;
  isActive: boolean;
  branchId: mongoose.Types.ObjectId;
}

const CustomerSchema = new Schema<ICustomerDoc>({
  customerCode: { type: String, required: true, unique: true },
  name:         { type: String, required: true },
  nameAr:       { type: String, default: '' },
  phone:        { type: String, required: true },
  email:        { type: String },
  vatNumber:    { type: String },
  loyaltyPoints:{ type: Number, default: 0 },
  totalSpent:   { type: Number, default: 0 },
  visitCount:   { type: Number, default: 0 },
  segment:      { type: String, enum: ['bronze','silver','gold','platinum'], default: 'bronze' },
  notes:        { type: String },
  isActive:     { type: Boolean, default: true },
  branchId:     { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
}, { timestamps: true });

CustomerSchema.index({ phone: 1 });

export default mongoose.models.Customer || mongoose.model<ICustomerDoc>('Customer', CustomerSchema);
