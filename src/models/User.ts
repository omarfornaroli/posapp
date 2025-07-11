
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { User as UserType, UserRole, UserStatus } from '@/types';

export interface UserDocument extends Omit<UserType, 'id'>, Document {
  password?: string;
  setupToken?: string;
  setupTokenExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  comparePassword: (password: string) => Promise<boolean>;
}

const UserSchema: Schema<UserDocument> = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, select: false },
  status: { type: String, enum: ['pending', 'active'] as UserStatus[], default: 'pending', required: true },
  setupToken: { type: String, select: false },
  setupTokenExpires: { type: Date, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  role: { type: String, enum: ['Admin', 'Editor', 'Viewer'], required: true },
  joinDate: { type: Date, required: true, default: Date.now },
  imageUrl: { type: String },
  authorizationCode: { type: String, unique: true, sparse: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_users'
});

UserSchema.virtual('id').get(function(this: UserDocument) {
  return this._id.toHexString();
});

// Hash password before saving
UserSchema.pre<UserDocument>('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err as Error);
  }
});

// Method to compare password for login
UserSchema.methods.comparePassword = function(candidatePassword: string): Promise<boolean> {
  if (!this.password) {
    return Promise.resolve(false);
  }
  return bcrypt.compare(candidatePassword, this.password);
};


const User: Model<UserDocument> = models.User || mongoose.model<UserDocument>('User', UserSchema);

export default User;
