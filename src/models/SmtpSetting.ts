
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { SmtpSetting as SmtpSettingType } from '@/types';

export const SINGLETON_KEY = 'global_smtp_settings';

export interface SmtpSettingDocument extends SmtpSettingType, Document {
  key: string;
  id: string;
}

const SmtpSettingSchema: Schema<SmtpSettingDocument> = new Schema({
  key: { type: String, default: SINGLETON_KEY, unique: true, required: true, index: true },
  host: { type: String, trim: true },
  port: { type: Number },
  user: { type: String, trim: true },
  pass: { type: String, select: false }, // Do not return password by default
  from: { type: String, trim: true }, // e.g., '"Your App" <noreply@yourdomain.com>'
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_smtp_settings'
});

SmtpSettingSchema.virtual('id').get(function(this: SmtpSettingDocument) {
  return this._id.toHexString();
});

const SmtpSetting: Model<SmtpSettingDocument> =
  models.SmtpSetting || mongoose.model<SmtpSettingDocument>('SmtpSetting', SmtpSettingSchema);

export default SmtpSetting;
