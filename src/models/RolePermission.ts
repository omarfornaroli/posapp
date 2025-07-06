
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { UserRole, Permission, RolePermission as RolePermissionType } from '@/types';
import { ALL_PERMISSIONS } from '@/lib/permissionKeys'; // Import from new location

export interface RolePermissionDocument extends Omit<RolePermissionType, 'id'>, Document {}

const RolePermissionSchema: Schema<RolePermissionDocument> = new Schema({
  role: {
    type: String,
    enum: ['Admin', 'Editor', 'Viewer'] as UserRole[],
    required: true,
    unique: true,
    index: true,
  },
  permissions: [{
    type: String,
    enum: ALL_PERMISSIONS, 
    required: true,
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_role_permissions'
});

RolePermissionSchema.virtual('id').get(function(this: RolePermissionDocument) {
  return this._id.toHexString();
});

const RolePermission: Model<RolePermissionDocument> =
  models.RolePermission || mongoose.model<RolePermissionDocument>('RolePermission', RolePermissionSchema);

export default RolePermission;
