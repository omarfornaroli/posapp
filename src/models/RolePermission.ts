
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { UserRole, Permission, RolePermission as RolePermissionType } from '@/types';
import { ALL_PERMISSIONS } from '@/lib/permissionKeys'; // Import from new location

export interface RolePermissionDocument extends RolePermissionType, Document {
  id: string;
}

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
  toJSON: { 
    virtuals: true,
    transform: (doc, ret) => {
      // The virtual 'id' will be included.
      // We don't want to delete _id as it's needed by Mongoose.
    }
  },
  toObject: { 
    virtuals: true,
    transform: (doc, ret) => {
      // The virtual 'id' will be included.
    }
  },
  collection: 'pos_role_permissions'
});

RolePermissionSchema.virtual('id').get(function(this: Document) {
  return this._id.toHexString();
});

const RolePermission: Model<RolePermissionDocument> =
  models.RolePermission || mongoose.model<RolePermissionDocument>('RolePermission', RolePermissionSchema);

export default RolePermission;
