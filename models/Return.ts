import mongoose, { Schema, Document } from 'mongoose';

const InvoiceLineSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  name:      String, nameAr: String,
  qty:       Number, unit: String,
  unitPrice: Number, discount: Number,
  vatRate:   Number, vatAmount: Number, lineTotal: Number,
}, { _id: false });

export interface IReturnDoc extends Document {
  returnNumber: string;
  originalInvoiceId: mongoose.Types.ObjectId;
  originalInvoiceNumber: string;
  customerId?: mongoose.Types.ObjectId;
  lines: unknown[];
  subtotal: number;
  vatTotal: number;
  grandTotal: number;
  reason: string;
  refundMethod: 'cash' | 'card' | 'loyalty' | 'credit_note';
  processedBy: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
}

const ReturnSchema = new Schema<IReturnDoc>({
  returnNumber:          { type: String, required: true, unique: true },
  originalInvoiceId:     { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
  originalInvoiceNumber: { type: String, required: true },
  customerId:            { type: Schema.Types.ObjectId, ref: 'Customer' },
  lines:                 [InvoiceLineSchema],
  subtotal:              { type: Number, required: true },
  vatTotal:              { type: Number, required: true },
  grandTotal:            { type: Number, required: true },
  reason:                { type: String, required: true },
  refundMethod:          { type: String, enum: ['cash','card','loyalty','credit_note'], required: true },
  processedBy:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
  branchId:              { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
}, { timestamps: true });

export default mongoose.models.Return || mongoose.model<IReturnDoc>('Return', ReturnSchema);
