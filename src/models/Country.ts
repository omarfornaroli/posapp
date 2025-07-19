
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { Country as CountryType } from '@/types';

export interface CountryDocument extends CountryType, Document {
  id: string;
}

const CountrySchema: Schema<CountryDocument> = new Schema({
  name: { type: String, required: true, trim: true, index: true },
  codeAlpha2: { type: String, required: true, unique: true, uppercase: true, trim: true, minlength: 2, maxlength: 2, index: true },
  codeAlpha3: { type: String, unique: true, uppercase: true, trim: true, minlength: 3, maxlength: 3, index: true, sparse: true },
  numericCode: { type: String, trim: true, unique: true, sparse: true },
  currencyCode: { type: String, trim: true, uppercase: true },
  flagImageUrl: { type: String, trim: true },
  isEnabled: { type: Boolean, default: true, required: true },
  isDefault: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_countries'
});

CountrySchema.virtual('id').get(function(this: Document) {
  return this._id.toHexString();
});

CountrySchema.pre('save', async function(this: CountryDocument, next) {
  if (this.isModified('isDefault') && this.isDefault) {
    const model = this.constructor as Model<CountryDocument>;
    await model.updateMany({ _id: { $ne: this._id }, isDefault: true }, { isDefault: false });
  }
  next();
});


const Country: Model<CountryDocument> =
  models.Country || mongoose.model<CountryDocument>('Country', CountrySchema);

export default Country;
