
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { GridSetting as GridSettingType, PersistedColumnSetting, SortConfig } from '@/types';

export interface GridSettingDocument extends GridSettingType, Document {
  id: string;
}

const PersistedColumnSettingSchema = new Schema<PersistedColumnSetting>({
  key: { type: String, required: true },
  visible: { type: Boolean, required: true },
}, { _id: false });

const SortConfigSchema = new Schema<SortConfig>({
  key: { type: String, required: true },
  direction: { type: String, enum: ['asc', 'desc'], required: true },
}, { _id: false });

const GridSettingSchema: Schema<GridSettingDocument> = new Schema({
  pagePath: { type: String, required: true, unique: true, index: true },
  columns: [PersistedColumnSettingSchema],
  sortConfig: { type: SortConfigSchema, default: null },
  groupingKeys: { type: [String], default: [] }, // Changed from groupingKey: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_grid_settings'
});

GridSettingSchema.virtual('id').get(function(this: Document) {
  return this._id.toHexString();
});

const GridSetting: Model<GridSettingDocument> =
  models.GridSetting || mongoose.model<GridSettingDocument>('GridSetting', GridSettingSchema);

export default GridSetting;
