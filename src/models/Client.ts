
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { Client as ClientType } from '@/types';

export interface ClientDocument extends ClientType, Document { 
  id: string;
}

const ClientSchema: Schema<ClientDocument> = new Schema({
  name: { type: Schema.Types.String, required: true },
  email: { type: Schema.Types.String, required: true, unique: true, lowercase: true, trim: true },
  phone:  { type: Schema.Types.String},
  address:  { type: Schema.Types.String},
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
