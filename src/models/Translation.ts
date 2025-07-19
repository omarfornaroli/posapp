
import mongoose, { Schema, Document, models, Model } from 'mongoose';

export interface TranslationRecord {
  keyPath: string;
  values: Map<string, string>; // Key is locale code (e.g., "en", "es"), value is the translation
}

export interface TranslationDocument extends TranslationRecord, Document {
  id: string;
}

const TranslationSchema: Schema<TranslationDocument> = new Schema({
  keyPath: { type: String, required: true, unique: true, index: true },
  values: {
    type: Map,
    of: String,
    required: true,
    default: {},
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_translations'
});

TranslationSchema.virtual('id').get(function(this: Document) {
  return this._id.toHexString();
});

const Translation: Model<TranslationDocument> = 
  models.Translation || mongoose.model<TranslationDocument>('Translation', TranslationSchema);

export default Translation;
