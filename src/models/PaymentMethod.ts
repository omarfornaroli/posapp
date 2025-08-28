

import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { PaymentMethod as PaymentMethodType } from '@/types';

export interface PaymentMethodDocument extends Omit<PaymentMethodType, 'name' | 'description'>, Document {
  id: string;
  name: Map<string, string>;
  description?: Map<string, string>;
}

const PaymentMethodSchema: Schema<PaymentMethodDocument> = new Schema({
  name: {
    type: Map,
    of: String,
    required: true,
  },
  description: {
    type: Map,
    of: String,
    default: {},
  },
  isEnabled: { type: Boolean, default: true, required: true },
  isDefault: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: (doc, ret) => {
      if (ret.name) ret.name = Object.fromEntries(ret.name);
      if (ret.description) ret.description = Object.fromEntries(ret.description);
    }
  },
  toObject: { 
    virtuals: true,
    transform: (doc, ret) => {
      if (ret.name) ret.name = Object.fromEntries(ret.name);
      if (ret.description) ret.description = Object.fromEntries(ret.description);
    }
  },
  collection: 'pos_payment_methods'
});

PaymentMethodSchema.virtual('id').get(function(this: PaymentMethodDocument) {
  return this._id.toHexString();
});

const PaymentMethod: Model<PaymentMethodDocument> = 
  models.PaymentMethod || mongoose.model<PaymentMethodDocument>('PaymentMethod', PaymentMethodSchema);

export default PaymentMethod;

