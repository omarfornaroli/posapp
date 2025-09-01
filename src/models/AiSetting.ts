
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { AiSetting as AiSettingType } from '@/types';

export const SINGLETON_KEY = 'global_ai_settings';

export interface AiSettingDocument extends AiSettingType, Document {
  key: string;
  id: string;
}

const AiSettingSchema: Schema<AiSettingDocument> = new Schema({
  key: { type: String, default: SINGLETON_KEY, unique: true, required: true, index: true },
  geminiApiKey: { type: String, select: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_ai_settings'
});

AiSettingSchema.virtual('id').get(function(this: Document) {
  return this._id.toHexString();
});

const AiSetting: Model<AiSettingDocument> =
  models.AiSetting || mongoose.model<AiSettingDocument>('AiSetting', AiSettingSchema);

export default AiSetting;
