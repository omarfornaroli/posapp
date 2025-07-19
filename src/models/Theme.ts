
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { Theme as ThemeType, ThemeColors } from '@/types';

const ThemeColorsSchema = new Schema<ThemeColors>({
  background: { type: String, required: true },
  foreground: { type: String, required: true },
  card: { type: String, required: true },
  cardForeground: { type: String, required: true },
  popover: { type: String, required: true },
  popoverForeground: { type: String, required: true },
  primary: { type: String, required: true },
  primaryForeground: { type: String, required: true },
  secondary: { type: String, required: true },
  secondaryForeground: { type: String, required: true },
  muted: { type: String, required: true },
  mutedForeground: { type: String, required: true },
  accent: { type: String, required: true },
  accentForeground: { type: String, required: true },
  destructive: { type: String, required: true },
  destructiveForeground: { type: String, required: true },
  border: { type: String, required: true },
  input: { type: String, required: true },
  ring: { type: String, required: true },
}, { _id: false });

export interface ThemeDocument extends ThemeType, Document {
  id: string;
}

const ThemeSchema: Schema<ThemeDocument> = new Schema({
  name: { type: String, required: true, unique: true },
  isDefault: { type: Boolean, default: false },
  colors: { type: ThemeColorsSchema, required: true },
  fontBody: { type: String, required: true, default: 'Inter' },
  fontHeadline: { type: String, required: true, default: 'Poppins' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_themes'
});

ThemeSchema.virtual('id').get(function(this: Document) {
  return this._id.toHexString();
});

const Theme: Model<ThemeDocument> = models.Theme || mongoose.model<ThemeDocument>('Theme', ThemeSchema);

export default Theme;

    