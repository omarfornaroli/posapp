

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
    validate: {
      validator: function(this: PaymentMethodDocument, v: Map<string, string>) {
        // Ensure the map is not empty and has a value for the default/primary locale ('en')
        return v && v.size > 0 && v.get('en') && v.get('en')!.trim().length > 0;
      },
      message: 'Payment method name must have a value for the default language (en).'
    }
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
