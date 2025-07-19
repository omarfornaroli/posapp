
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { POSSetting as POSSettingType } from '@/types';

export const SINGLETON_KEY = 'global_pos_settings';

export interface POSSettingDocument extends Omit<POSSettingType, 'id'>, Document {
  key: string;
}

const POSSettingSchema: Schema<POSSettingDocument> = new Schema({
  key: { type: String, default: SINGLETON_KEY, unique: true, required: true, index: true },
  requireAuthForCartItemRemoval: { type: Boolean, default: true },
  dispatchAtSaleDefault: { type: Boolean, default: true },
  separateCartAndPayment: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_pos_settings'
});

POSSettingSchema.virtual('id').get(function(this: POSSettingDocument) {
  return this._id.toHexString();
});

const POSSetting: Model<POSSettingDocument> =
  models.POSSetting || mongoose.model<POSSettingDocument>('POSSetting', POSSettingSchema);

export default POSSetting;
