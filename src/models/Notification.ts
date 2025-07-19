
import mongoose, { Schema, Document, models, Model } from 'mongoose';
import type { Notification as NotificationType, NotificationEnumType } from '@/types';

export interface NotificationDocument extends NotificationType, Document {
  id: string;
}

const NotificationSchema: Schema<NotificationDocument> = new Schema({
  messageKey: { type: String, required: true },
  messageParams: { type: Schema.Types.Mixed }, // Store as flexible object
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'system'] satisfies NotificationEnumType[],
    required: true,
    default: 'info',
  },
  isRead: { type: Boolean, default: false, required: true },
  link: { type: String },
  userId: { type: String, index: true }, // For user-specific notifications
  actorId: { type: String, index: true },
  actorName: { type: String },
  actorImageUrl: { type: String },
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  collection: 'pos_notifications'
});

NotificationSchema.virtual('id').get(function(this: Document) {
  return this._id.toHexString();
});

const Notification: Model<NotificationDocument> =
  models.Notification || mongoose.model<NotificationDocument>('Notification', NotificationSchema);

export default Notification;
