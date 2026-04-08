import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBranchDocument extends Document {
  code: string;
  name: string;
  nameAr: string;
  address: string;
  phone?: string;
  isActive: boolean;
}

const BranchSchema = new Schema<IBranchDocument>(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Branch: Model<IBranchDocument> =
  mongoose.models.Branch || mongoose.model<IBranchDocument>('Branch', BranchSchema);

export default Branch;
