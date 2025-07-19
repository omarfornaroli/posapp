
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { Tax as TaxType } from '@/types';

export interface TaxDocument extends TaxType, Document {
  id: string;
}

const TaxSchema: Schema<TaxDocument> = new Schema({
  name: { type: String, required: true, unique: true },
  rate: { type: Number, required: true, min: 0, max: 1 },
  description: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_taxes'
});

TaxSchema.virtual('id').get(function(this: Document) {
  return this._id.toHexString();
});

const Tax: Model<TaxDocument> = models.Tax || mongoose.model<TaxDocument>('Tax', TaxSchema);

export default Tax;

    