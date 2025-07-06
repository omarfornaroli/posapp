
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { Report as ReportType } from '@/types';

// The structure of the saved report data from the AI flow
const ReportDataSchema = new Schema({
  title: { type: String, required: true },
  summary: { type: String, required: true },
  headers: { type: [String], required: true },
  rows: { type: [[Schema.Types.Mixed]], required: true }
}, { _id: false });

export interface ReportDocument extends Omit<ReportType, 'id' | 'createdAt' | 'updatedAt' | 'reportData'>, Document {
  reportData: {
    title: string;
    summary: string;
    headers: string[];
    rows: (string | number)[][];
  };
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<ReportDocument>({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  query: { type: String, required: true },
  reportData: { type: ReportDataSchema, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_reports'
});

ReportSchema.virtual('id').get(function(this: ReportDocument) {
  return this._id.toHexString();
});

const Report: Model<ReportDocument> = models.Report || mongoose.model<ReportDocument>('Report', ReportSchema);

export default Report;

    