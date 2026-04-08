import mongoose, { Schema, Document, Model } from 'mongoose';
import type { HardwareSettings as HardwareSettingsType, HardwareTestResultMap } from '@/types';
import { DEFAULT_HARDWARE_SETTINGS, createDefaultHardwareTests } from '@/lib/hardware';

export interface IHardwareSettingsDocument extends Document {
  branchId: mongoose.Types.ObjectId;
  settings: HardwareSettingsType;
  testResults: HardwareTestResultMap;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HardwareSettingsSchema = new Schema<IHardwareSettingsDocument>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, unique: true },
    settings: { type: Schema.Types.Mixed, required: true, default: () => ({ ...DEFAULT_HARDWARE_SETTINGS }) },
    testResults: { type: Schema.Types.Mixed, required: true, default: () => createDefaultHardwareTests() },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const HardwareSettings: Model<IHardwareSettingsDocument> =
  mongoose.models.HardwareSettings ||
  mongoose.model<IHardwareSettingsDocument>('HardwareSettings', HardwareSettingsSchema);

export default HardwareSettings;
