import mongoose, { Schema, Document } from 'mongoose';

export interface IShiftDoc extends Document {
  shiftNumber: string;
  cashierId: mongoose.Types.ObjectId;
  cashierName: string;
  branchId: mongoose.Types.ObjectId;
  openingFloat: number;
  closingFloat?: number;
  denominations?: { value: number; count: number }[];
  expectedCash?: number;
  cashVariance?: number;
  totalSales: number;
  totalReturns: number;
  totalCash: number;
  totalCard: number;
  totalLoyalty: number;
  transactionCount: number;
  openedAt: Date;
  closedAt?: Date;
  status: 'open' | 'closed';
  notes?: string;
}

const ShiftSchema = new Schema<IShiftDoc>({
  shiftNumber:      { type: String, required: true, unique: true },
  cashierId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  cashierName:      { type: String, required: true },
  branchId:         { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  openingFloat:     { type: Number, required: true, default: 0 },
  closingFloat:     { type: Number },
  denominations:    [{ value: Number, count: Number }],
  expectedCash:     { type: Number },
  cashVariance:     { type: Number },
  totalSales:       { type: Number, default: 0 },
  totalReturns:     { type: Number, default: 0 },
  totalCash:        { type: Number, default: 0 },
  totalCard:        { type: Number, default: 0 },
  totalLoyalty:     { type: Number, default: 0 },
  transactionCount: { type: Number, default: 0 },
  openedAt:         { type: Date, default: Date.now },
  closedAt:         { type: Date },
  status:           { type: String, enum: ['open','closed'], default: 'open' },
  notes:            { type: String },
}, { timestamps: false });

ShiftSchema.index({ branchId: 1, status: 1 });

export default mongoose.models.Shift || mongoose.model<IShiftDoc>('Shift', ShiftSchema);
