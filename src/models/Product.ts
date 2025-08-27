
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { Product as ProductType, Supplier } from '@/types';

export interface ProductDocument extends ProductType, Document {
  id: string;
}

const ProductSchema: Schema<ProductDocument> = new Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true, unique: true, sparse: true },
  barcode: { type: String, required: true, unique: true, trim: true },
  measurementUnit: { type: String, trim: true }, 
  cost: { type: Number, min: 0 },
  markup: { type: Number, min: 0 },
  price: { type: Number, required: true, min: 0 },
  tax: { type: Number, min: 0, max: 1 }, 
  isTaxInclusivePrice: { type: Boolean, default: false },
  isPriceChangeAllowed: { type: Boolean, default: true },
  isUsingDefaultQuantity: { type: Boolean, default: true },
  isService: { type: Boolean, default: false },
  isEnabled: { type: Boolean, default: true },
  dispatchAtSale: { type: Boolean, default: true },
  description: { type: String, trim: true },
  quantity: { type: Number, required: true, min: 0, default: 0 }, 
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
  reorderPoint: { type: Number, min: 0 },
  preferredQuantity: { type: Number, min: 0 },
  lowStockWarning: { type: Boolean, default: false },
  warningQuantity: { type: Number, min: 0 },
  category: { type: String, required: true, trim: true },
  imageUrl: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_products'
});

ProductSchema.virtual('id').get(function(this: Document) {
  return this._id.toHexString();
});

ProductSchema.index({ name: 'text', description: 'text', category: 1, sku: 1 });


const Product: Model<ProductDocument> = models.Product || mongoose.model<ProductDocument>('Product', ProductSchema);

export default Product;
