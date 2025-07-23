
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { Client as ClientType } from '@/types';

export interface ClientDocument extends ClientType, Document { 
  id: string;
}

const ClientSchema: Schema<ClientDocument> = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:  { type: String },
  address:  { type: String },
  registrationDate: { type: Date, required: true, default: Date.now },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_clients'
});

ClientSchema.virtual('id').get(function (this: Document) {
  return this._id.toHexString();
});

const Client: Model<ClientDocument> = models.Client || mongoose.model<ClientDocument>('Client', ClientSchema);

export default Client;
