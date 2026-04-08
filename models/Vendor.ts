import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVendorDocument extends Document {
  code: string;
  name: string;
  nameAr: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  vatNumber?: string;
  creditLimit: number;
  currentBalance: number;
  paymentTerms: number;
  isActive: boolean;
}

const VendorSchema = new Schema<IVendorDocument>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    contactPerson: { type: String },
    phone: { type: String },
    email: { type: String, lowercase: true },
    address: { type: String },
    vatNumber: { type: String },
    creditLimit: { type: Number, default: 0, min: 0 },
    currentBalance: { type: Number, default: 0 },
    paymentTerms: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

VendorSchema.index({ name: 'text', nameAr: 'text' });

const Vendor: Model<IVendorDocument> =
  mongoose.models.Vendor || mongoose.model<IVendorDocument>('Vendor', VendorSchema);

export default Vendor;
