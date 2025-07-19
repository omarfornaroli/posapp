
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { AppLanguage as AppLanguageType } from '@/types';

export interface AppLanguageDocument extends AppLanguageType, Document {
    id: string;
}

const AppLanguageSchema: Schema<AppLanguageDocument> = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  isEnabled: {
    type: Boolean,
    default: true,
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_app_languages'
});

AppLanguageSchema.virtual('id').get(function(this: Document) {
  return this._id.toHexString();
});

// Ensure only one language can be default
AppLanguageSchema.pre('save', async function(this: AppLanguageDocument, next) {
  if (this.isModified('isDefault') && this.isDefault) {
    const model = this.constructor as Model<AppLanguageDocument>;
    await model.updateMany({ _id: { $ne: this._id }, isDefault: true }, { isDefault: false });
  }
  next();
});

const AppLanguage: Model<AppLanguageDocument> =
  models.AppLanguage || mongoose.model<AppLanguageDocument>('AppLanguage', AppLanguageSchema);

export default AppLanguage;

    