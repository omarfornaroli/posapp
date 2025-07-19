
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { PaymentMethod as PaymentMethodType } from '@/types';

export interface PaymentMethodDocument extends PaymentMethodType, Document {
  id: string;
}

const PaymentMethodSchema: Schema<PaymentMethodDocument> = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true },
  isEnabled: { type: Boolean, default: true, required: true },
  isDefault: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_payment_methods'
});

PaymentMethodSchema.virtual('id').get(function(this: Document) {
  return this._id.toHexString();
});

const PaymentMethod: Model<PaymentMethodDocument> = 
  models.PaymentMethod || mongoose.model<PaymentMethodDocument>('PaymentMethod', PaymentMethodSchema);

export default PaymentMethod;
