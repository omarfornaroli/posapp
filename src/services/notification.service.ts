
// src/services/notification.service.ts
import NotificationModel from '@/models/Notification';
import type { NotificationEnumType } from '@/types';

// IMPORTANT: This service assumes a database connection has already been established
// by the calling context (e.g., an API route handler or a dedicated script).
// It does NOT call dbConnect itself to avoid circular dependencies.

interface CreateNotificationParams {
  messageKey: string;
  messageParams?: Record<string, string | number>;
  type: NotificationEnumType;
  link?: string;
  userId?: string; // For user-specific notifications
  actorId?: string;
  actorName?: string;
  actorImageUrl?: string;
}

export class NotificationService {
  public static async createNotification(params: CreateNotificationParams): Promise<void> {
    try {
      // The dbConnect call is removed from here.
      await NotificationModel.create({
        messageKey: params.messageKey,
        messageParams: params.messageParams || {},
        type: params.type,
        link: params.link,
        userId: params.userId,
        actorId: params.actorId,
        actorName: params.actorName,
        actorImageUrl: params.actorImageUrl,
        isRead: false, // New notifications are unread
      });
      console.log(`Notification created: ${params.messageKey}`);
    } catch (error) {
      console.error('Error creating notification (DB connection must be established by caller):', error);
      // Depending on requirements, might re-throw or handle silently
    }
  }
}

export default NotificationService;
