import mongoose, { Schema, Document } from 'mongoose';

export interface IStockTransferDoc extends Document {
  transferNumber: string;
  fromBranchId: mongoose.Types.ObjectId;
  toBranchId: mongoose.Types.ObjectId;
  lines: { productId: mongoose.Types.ObjectId; productName: string; batchId?: mongoose.Types.ObjectId; batchNumber?: string; qty: number; unit: string; }[];
  status: 'pending' | 'in_transit' | 'received' | 'cancelled';
  requestedBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  notes?: string;
  receivedAt?: Date;
}

const TransferLineSchema = new Schema({
  productId:   { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: String,
  batchId:     { type: Schema.Types.ObjectId, ref: 'Batch' },
  batchNumber: String,
  qty:         { type: Number, required: true },
  unit:        String,
}, { _id: false });

const StockTransferSchema = new Schema<IStockTransferDoc>({
  transferNumber: { type: String, required: true, unique: true },
  fromBranchId:   { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  toBranchId:     { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  lines:          [TransferLineSchema],
  status:         { type: String, enum: ['pending','in_transit','received','cancelled'], default: 'pending' },
  requestedBy:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy:     { type: Schema.Types.ObjectId, ref: 'User' },
  notes:          String,
  receivedAt:     Date,
}, { timestamps: true });

export default mongoose.models.StockTransfer || mongoose.model<IStockTransferDoc>('StockTransfer', StockTransferSchema);
