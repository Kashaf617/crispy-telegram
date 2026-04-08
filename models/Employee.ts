import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmployeeDocument extends Document {
  employeeId: string;
  name: string;
  nameAr: string;
  position: string;
  positionAr: string;
  department: string;
  nationality: string;
  iqamaNumber?: string;
  iqamaExpiry?: Date;
  passportNumber?: string;
  passportExpiry?: Date;
  phone?: string;
  email?: string;
  salary: number;
  joinDate: Date;
  isActive: boolean;
  branchId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
}

const EmployeeSchema = new Schema<IEmployeeDocument>(
  {
    employeeId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    position: { type: String, required: true },
    positionAr: { type: String, required: true },
    department: { type: String, required: true },
    nationality: { type: String, required: true },
    iqamaNumber: { type: String },
    iqamaExpiry: { type: Date },
    passportNumber: { type: String },
    passportExpiry: { type: Date },
    phone: { type: String },
    email: { type: String, lowercase: true },
    salary: { type: Number, required: true, min: 0 },
    joinDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

EmployeeSchema.index({ branchId: 1 });
EmployeeSchema.index({ iqamaExpiry: 1 });

const Employee: Model<IEmployeeDocument> =
  mongoose.models.Employee || mongoose.model<IEmployeeDocument>('Employee', EmployeeSchema);

export default Employee;
