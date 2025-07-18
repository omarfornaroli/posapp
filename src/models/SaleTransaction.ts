
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { SaleTransaction as SaleTransactionType, CartItem as CartItemType, AppliedTaxEntry, AppliedPromotionEntry, AppliedPayment, DispatchStatus } from '@/types';

export const CartItemSchema = new Schema<Omit<CartItemType, 'id'>>({
  productId: { type: String, required: true }, 
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  dispatchedQuantity: { type: Number, default: 0 },
  category: { type: String },
  imageUrl: { type: String },
  barcode: { type: String },
  isService: { type: Boolean, default: false },
  itemDiscountType: { type: String, enum: ['percentage', 'fixedAmount'] },
  itemDiscountValue: { type: Number, min: 0 },
}, { _id: false });

export const AppliedTaxEntrySchema = new Schema<AppliedTaxEntry>({
  taxId: { type: String, required: true }, 
  name: { type: String, required: true },
  rate: { type: Number, required: true }, 
  amount: { type: Number, required: true }, 
}, { _id: false });

export const AppliedPromotionEntrySchema = new Schema<AppliedPromotionEntry>({
  promotionId: { type: String, required: true },
  name: { type: String, required: true },
  discountType: { type: String, enum: ['percentage', 'fixedAmount'], required: true },
  discountValue: { type: Number, required: true },
  amountDeducted: { type: Number, required: true },
}, { _id: false });

export const AppliedPaymentSchema = new Schema<AppliedPayment>({
  methodId: { type: String, required: true },
  methodName: { type: String, required: true },
  amount: { type: Number, required: true, min: 0.01 },
}, { _id: false });


export interface SaleTransactionDocument extends Omit<SaleTransactionType, 'id'>, Document {}

const SaleTransactionSchema: Schema<SaleTransactionDocument> = new Schema({
  date: { type: Date, required: true, default: Date.now },
  items: [CartItemSchema],
  
  subtotal: { type: Number, required: true }, 
  totalItemDiscountAmount: { type: Number, required: true, default: 0 },

  overallDiscountType: { type: String, enum: ['percentage', 'fixedAmount'] },
  overallDiscountValue: { type: Number, min: 0 },
  overallDiscountAmountApplied: { type: Number, default: 0 }, 
  
  promotionalDiscountAmount: { type: Number, required: true, default: 0 }, 
  
  taxAmount: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  dispatchStatus: { type: String, enum: ['Pending', 'Partially Dispatched', 'Dispatched'], default: 'Pending', required: true, index: true },

  appliedPayments: [AppliedPaymentSchema], 
  clientId: { type: String }, 
  clientName: { type: String }, 
  appliedTaxes: [AppliedTaxEntrySchema],
  appliedPromotions: [AppliedPromotionEntrySchema],

  // Transaction Currency Details
  currencyCode: { type: String, required: true },
  currencySymbol: { type: String, required: true },
  currencyDecimalPlaces: { type: Number, required: true },
  
  // Base Currency Details
  baseCurrencyCode: { type: String, required: true },
  totalInBaseCurrency: { type: Number, required: true },
  exchangeRate: { type: Number, required: true, default: 1 },

  // Audit Fields
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  
}, {
  timestamps: true, 
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_sale_transactions'
});

SaleTransactionSchema.virtual('id').get(function(this: SaleTransactionDocument) {
  return this._id.toHexString();
});

const SaleTransaction: Model<SaleTransactionDocument> = 
  models.SaleTransaction || mongoose.model<SaleTransactionDocument>('SaleTransaction', SaleTransactionSchema);

export default SaleTransaction;

    