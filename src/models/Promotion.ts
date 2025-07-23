
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { Promotion as PromotionType, PromotionDiscountType, PromotionCondition } from '@/types';

const PromotionConditionSchema = new Schema<PromotionCondition>({
  type: {
    type: String,
    enum: ['minSellAmount', 'clientIds', 'productIds', 'productCategories', 'paymentMethods', 'itemQuantity'],
    required: true
  },
  value: { type: Schema.Types.Mixed },
  values: [{ type: String }],
  operator: { type: String, enum: ['gte', 'in'] },
}, { _id: false });


export interface PromotionDocument extends Omit<PromotionType, 'id' | 'startDate' | 'endDate' | 'createdAt' | 'updatedAt'>, Document {
  id: string;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema: Schema<PromotionDocument> = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  discountType: { type: String, enum: ['percentage', 'fixedAmount'] as PromotionDiscountType[], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  conditions: [PromotionConditionSchema],
  isActive: { type: Boolean, default: true, required: true },
  applicationMethod: { type: String, enum: ['cart', 'lowestPriceItem'], default: 'cart' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        if (ret.startDate) ret.startDate = ret.startDate.toISOString();
        if (ret.endDate) ret.endDate = ret.endDate.toISOString();
    }
   },
  toObject: { 
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        if (ret.startDate) ret.startDate = ret.startDate.toISOString();
        if (ret.endDate) ret.endDate = ret.endDate.toISOString();
    }
  },
  collection: 'pos_promotions'
});

PromotionSchema.virtual('id').get(function (this: Document) {
  return this._id.toHexString();
});

const Promotion: Model<PromotionDocument> = models.Promotion || mongoose.model<PromotionDocument>('Promotion', PromotionSchema);

export default Promotion;
