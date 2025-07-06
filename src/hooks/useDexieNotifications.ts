// src/hooks/useDexieNotifications.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { Notification } from '@/types';
import { useState, useEffect, useCallback, useRef } from 'react';

const POLLING_INTERVAL = 15000; // 15 seconds

export function useDexieNotifications() {
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  // Live queries for reactive data from Dexie
  const notifications = useLiveQuery(() => db.notifications.orderBy('createdAt').reverse().toArray(), []);
  const unreadCount = useLiveQuery(() => db.notifications.filter(n => !n.isRead).count(), 0);

  const populateAndPoll = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
        if (isMounted.current) setIsLoading(true);
    }
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const result = await response.json();
      if (result.success) {
        // bulkPut acts as an upsert, adding new notifications and updating existing ones.
        await db.notifications.bulkPut(result.data);
      } else {
        throw new Error(result.error || 'API error fetching notifications');
      }
    } catch (error) {
      console.warn("[useDexieNotifications] Failed to populate/poll notifications (likely offline):", error);
    } finally {
      if (isInitialLoad && isMounted.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    populateAndPoll(true); // Initial fetch
    const intervalId = setInterval(() => populateAndPoll(false), POLLING_INTERVAL);
    return () => {
      isMounted.current = false;
      clearInterval(intervalId);
    };
  }, [populateAndPoll]);

  const toggleReadStatus = async (notificationId: string) => {
    const notification = await db.notifications.get(notificationId);
    if (!notification) return;
    const newReadStatus = !notification.isRead;
    const updatedNotification = { ...notification, isRead: newReadStatus };
    
    await db.notifications.put(updatedNotification);
    await syncService.addToQueue({ entity: 'notification', operation: 'update', data: { id: notificationId, isRead: newReadStatus } });
  };

  const deleteNotification = async (notificationId: string) => {
    await db.notifications.delete(notificationId);
    await syncService.addToQueue({ entity: 'notification', operation: 'delete', data: { id: notificationId } });
  };

  return { 
    notifications: notifications || [], 
    unreadCount: unreadCount || 0,
    isLoading: isLoading || notifications === undefined, 
    refetch: () => populateAndPoll(true), 
    toggleReadStatus, 
    deleteNotification 
  };
}
