
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { Supplier as SupplierType } from '@/types';

export interface SupplierDocument extends SupplierType, Document {
  id: string;
}

const SupplierSchema: Schema<SupplierDocument> = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  contactPerson: { type: String, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  website: { type: String, trim: true },
  notes: { type: String, trim: true },
  isEnabled: { type: Boolean, default: true, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_suppliers'
});

SupplierSchema.virtual('id').get(function(this: Document) {
  return this._id.toHexString();
});

const Supplier: Model<SupplierDocument> =
  models.Supplier || mongoose.model<SupplierDocument>('Supplier', SupplierSchema);

export default Supplier;
