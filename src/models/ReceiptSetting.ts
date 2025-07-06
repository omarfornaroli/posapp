import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { ReceiptSetting as ReceiptSettingType, ReceiptMargin } from '@/types';

// Using a fixed key to ensure only one document for global settings
export const SINGLETON_KEY = 'global_receipt_settings';

export interface ReceiptSettingDocument extends Omit<ReceiptSettingType, 'id'>, Document {
  key: string; // To enforce singleton
}

const receiptMarginOptions: ReceiptMargin[] = ['none', 'small', 'medium', 'large'];

const ReceiptSettingSchema: Schema<ReceiptSettingDocument> = new Schema({
  key: { type: String, default: SINGLETON_KEY, unique: true, required: true, index: true },
  logoUrl: { type: String },
  footerText: { type: String },

  companyName: { type: String },
  companyAddress: { type: String },
  companyPhone: { type: String },

  receiptWidth: { type: String, enum: ['80mm', '58mm', 'auto'], default: 'auto' },
  receiptMargin: { type: String, enum: receiptMarginOptions, default: 'small' },

  showCompanyName: { type: Boolean, default: true },
  showCompanyAddress: { type: Boolean, default: true },
  showCompanyPhone: { type: Boolean, default: true },
  showClientInfo: { type: Boolean, default: true },
  showItemBarcodes: { type: Boolean, default: false },
  showDiscountSummary: { type: Boolean, default: true },
  showPromotionsApplied: { type: Boolean, default: true },
  showPaymentMethodsDetails: { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_receipt_settings'
});

ReceiptSettingSchema.virtual('id').get(function(this: ReceiptSettingDocument) {
  return this._id.toHexString();
});

const ReceiptSetting: Model<ReceiptSettingDocument> =
  models.ReceiptSetting || mongoose.model<ReceiptSettingDocument>('ReceiptSetting', ReceiptSettingSchema);

export default ReceiptSetting;
