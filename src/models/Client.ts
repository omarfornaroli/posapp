
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { Client as ClientType } from '@/types';

export interface ClientDocument extends Omit<ClientType, 'id' | 'registrationDate' | 'createdAt' | 'updatedAt'>, Document { 
  id: string;
  registrationDate: Date;
  createdAt: Date;
  updatedAt: Date;
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
  toJSON: { 
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      // Convert date to string for consistency with type
      if (ret.registrationDate) ret.registrationDate = ret.registrationDate.toISOString();
    }
  },
  toObject: { 
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      if (ret.registrationDate) ret.registrationDate = ret.registrationDate.toISOString();
    }
  },
  collection: 'pos_clients'
});

ClientSchema.virtual('id').get(function (this: Document) {
  return this._id.toHexString();
});

const Client: Model<ClientDocument> = models.Client || mongoose.model<ClientDocument>('Client', ClientSchema);

export default Client;
