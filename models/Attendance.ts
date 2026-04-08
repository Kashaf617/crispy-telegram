import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendanceDocument extends Document {
  employeeId: mongoose.Types.ObjectId;
  date: Date;
  clockIn?: Date;
  clockOut?: Date;
  hoursWorked?: number;
  status: 'present' | 'absent' | 'late' | 'half-day' | 'leave';
  notes?: string;
}

const AttendanceSchema = new Schema<IAttendanceDocument>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    clockIn: { type: Date },
    clockOut: { type: Date },
    hoursWorked: { type: Number },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half-day', 'leave'],
      default: 'present',
    },
    notes: { type: String },
  },
  { timestamps: true }
);

AttendanceSchema.index({ employeeId: 1, date: -1 });
AttendanceSchema.index({ date: 1 });

const Attendance: Model<IAttendanceDocument> =
  mongoose.models.Attendance || mongoose.model<IAttendanceDocument>('Attendance', AttendanceSchema);

export default Attendance;
