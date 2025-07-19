
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { Currency as CurrencyType } from '@/types';

export interface CurrencyDocument extends CurrencyType, Document {
  id: string;
}

const CurrencySchema: Schema<CurrencyDocument> = new Schema({
  name: { type: String, required: true, trim: true, index: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, minlength: 3, maxlength: 3, index: true },
  symbol: { type: String, required: true, trim: true },
  decimalPlaces: { type: Number, required: true, min: 0, max: 4 },
  isEnabled: { type: Boolean, default: true, required: true },
  isDefault: { type: Boolean, default: false },
  exchangeRate: { type: Number }, // Optional, relative to a base currency
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_currencies'
});

CurrencySchema.virtual('id').get(function(this: Document) {
  return this._id.toHexString();
});

// Ensure only one currency can be default
CurrencySchema.pre('save', async function(next) {
  if (this.isModified('isDefault') && this.isDefault) {
    const model = this.constructor as Model<CurrencyDocument>;
    await model.updateMany({ _id: { $ne: this._id }, isDefault: true }, { isDefault: false });
  }
  next();
});

const Currency: Model<CurrencyDocument> =
  models.Currency || mongoose.model<CurrencyDocument>('Currency', CurrencySchema);

export default Currency;
