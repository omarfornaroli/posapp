
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { PendingCart as PendingCartType, AppliedTaxEntry, AppliedPromotionEntry } from '@/types';
import { CartItemSchema } from './SaleTransaction'; // Re-use sub-schemas

const AppliedTaxEntrySchema = new Schema<AppliedTaxEntry>({
  taxId: { type: String, required: true },
  name: { type: String, required: true },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true },
}, { _id: false });

const AppliedPromotionEntrySchema = new Schema<AppliedPromotionEntry>({
  promotionId: { type: String, required: true },
  name: { type: String, required: true },
  discountType: { type: String, enum: ['percentage', 'fixedAmount'], required: true },
  discountValue: { type: Number, required: true },
  amountDeducted: { type: Number, required: true },
}, { _id: false });

export interface PendingCartDocument extends PendingCartType, Document {
  id: string;
}

const PendingCartSchema = new Schema<PendingCartDocument>({
  cartName: { type: String, required: true },
  items: [CartItemSchema],
  clientId: { type: String },
  clientName: { type: String },
  
  subtotal: { type: Number, required: true },
  totalItemDiscountAmount: { type: Number, default: 0 },
  overallDiscountType: { type: String, enum: ['percentage', 'fixedAmount'] },
  overallDiscountValue: { type: Number },
  overallDiscountAmountApplied: { type: Number, default: 0 },
  promotionalDiscountAmount: { type: Number, default: 0 },
  appliedPromotions: [AppliedPromotionEntrySchema],
  taxAmount: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  appliedTaxes: [AppliedTaxEntrySchema],
  
  currencyCode: { type: String, required: true },
  currencySymbol: { type: String, required: true },
  currencyDecimalPlaces: { type: Number, required: true },
  baseCurrencyCode: { type: String, required: true },
  totalInBaseCurrency: { type: Number, required: true },
  exchangeRate: { type: Number, required: true },

  createdBy: {
    id: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String }
  },
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_pending_carts'
});

PendingCartSchema.virtual('id').get(function(this: Document) {
  return this._id.toHexString();
});

const PendingCart: Model<PendingCartDocument> =
  models.PendingCart || mongoose.model<PendingCartDocument>('PendingCart', PendingCartSchema);

export default PendingCart;
