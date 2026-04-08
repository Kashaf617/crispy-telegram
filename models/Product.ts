import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProductDocument extends Document {
  sku: string;
  barcode: string;
  name: string;
  nameAr: string;
  category: string;
  categoryAr: string;
  unit: 'kg' | 'g' | 'piece' | 'box' | 'liter' | 'ml';
  basePrice: number;
  sellPrice: number;
  vatRate: number;
  isWeighed: boolean;
  isActive: boolean;
  minStock: number;
  imageUrl?: string;
  branchId: mongoose.Types.ObjectId;
}

const ProductSchema = new Schema<IProductDocument>(
  {
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    barcode: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    categoryAr: { type: String, required: true, trim: true },
    unit: { type: String, enum: ['kg', 'g', 'piece', 'box', 'liter', 'ml'], default: 'piece' },
    basePrice: { type: Number, required: true, min: 0 },
    sellPrice: { type: Number, required: true, min: 0 },
    vatRate: { type: Number, default: 0.15, min: 0, max: 1 },
    isWeighed: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    minStock: { type: Number, default: 5, min: 0 },
    imageUrl: { type: String },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  },
  { timestamps: true }
);

ProductSchema.index({ branchId: 1 });
ProductSchema.index({ name: 'text', nameAr: 'text' });

const Product: Model<IProductDocument> =
  mongoose.models.Product || mongoose.model<IProductDocument>('Product', ProductSchema);

export default Product;
