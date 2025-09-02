
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { Return as ReturnType, ReturnItem as ReturnItemType } from '@/types';
import { CartItemSchema } from './SaleTransaction'; // Reuse the schema for item structure

export interface ReturnDocument extends ReturnType, Document {
  id: string;
}

const ReturnItemSchema = new Schema<ReturnItemType>({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  isService: { type: Boolean, default: false },
  barcode: { type: String },
  category: { type: String },
}, { _id: false });

const ReturnSchema: Schema<ReturnDocument> = new Schema({
  originalSaleId: { type: String, required: true, index: true },
  returnDate: { type: String, required: true, default: () => new Date().toISOString() },
  items: [ReturnItemSchema],
  totalRefundAmount: { type: Number, required: true },
  reason: { type: String, trim: true },
  notes: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
    }
   },
  toObject: { 
    virtuals: true,
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
    }
   },
  collection: 'pos_returns'
});

ReturnSchema.virtual('id').get(function (this: Document) {
  return this._id.toHexString();
});

const Return: Model<ReturnDocument> = models.Return || mongoose.model<ReturnDocument>('Return', ReturnSchema);

export default Return;
