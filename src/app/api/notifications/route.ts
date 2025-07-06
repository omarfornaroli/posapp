
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Notification from '@/models/Notification';

const DEFAULT_LIMIT_BELL = 20;
const DEFAULT_LIMIT_MANAGER = 100; // Default for manager if no pagination is used

export async function GET(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  
  // For the bell: specific small limit
  // For manager: if no limit, fetches more (or all if pagination not implemented yet)
  const limitParam = searchParams.get('limit');
  const pageParam = searchParams.get('page');
  const pageSizeParam = searchParams.get('pageSize');

  let query: any = {};
  let notifications;
  let totalNotifications = await Notification.countDocuments(query);
  let unreadCount = await Notification.countDocuments({ isRead: false });


  if (limitParam) { // Primarily for the bell
    const limit = parseInt(limitParam, 10) || DEFAULT_LIMIT_BELL;
    notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);
  } else if (pageParam && pageSizeParam) { // For paginated manager view
    const page = parseInt(pageParam, 10) || 1;
    const pageSize = parseInt(pageSizeParam, 10) || DEFAULT_LIMIT_MANAGER;
    notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);
  } else { // Default for manager view (fetch all or a large number)
    notifications = await Notification.find(query)
      .sort({ createdAt: -1 }); // Fetch all if no limit/pagination
  }

  return NextResponse.json({ 
    success: true, 
    data: notifications, 
    unreadCount, // Total unread for the bell badge
    totalNotifications, // Total for pagination on manager page
    currentPage: pageParam ? parseInt(pageParam, 10) : undefined,
    pageSize: pageSizeParam ? parseInt(pageSizeParam, 10) : undefined,
    totalPages: pageSizeParam ? Math.ceil(totalNotifications / parseInt(pageSizeParam, 10)) : undefined
  });
}
