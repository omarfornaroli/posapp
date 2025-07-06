
'use client';

import { useEffect } from 'react';
import { Bell, Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDexieNotifications } from '@/hooks/useDexieNotifications';
import type { Notification as NotificationType } from '@/types';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale'; 
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from '@/lib/utils';

interface NotificationItemProps {
  notification: NotificationType;
  onMarkAsRead: (id: string) => void;
  translate: (key: string, params?: Record<string, string | number>) => string;
  currentLocale: string;
}

const NotificationIcon: React.FC<{ type: NotificationType['type'] }> = ({ type }) => {
  switch (type) {
    case 'success': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'error': return <XCircle className="h-5 w-5 text-destructive" />;
    case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case 'info':
    case 'system':
    default: return <Info className="h-5 w-5 text-blue-500" />;
  }
};

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkAsRead, translate, currentLocale }) => {
  const translatedMessage = translate(notification.messageKey, notification.messageParams);
  
  const handleNotificationClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
  };

  const content = (
    <div className="flex items-start gap-x-3 py-2.5 px-3 cursor-pointer hover:bg-muted/50 rounded-md">
      <div className="flex flex-col items-center space-y-1 shrink-0 pt-0.5">
        {!notification.isRead && (
          <div className="w-2 h-2 bg-primary rounded-full" />
        )}
        {notification.isRead && !notification.actorName && (
           <div className="w-2 h-2" />
        )}
        {notification.actorName ? (
          <Avatar className="h-8 w-8">
            <AvatarImage src={notification.actorImageUrl} alt={notification.actorName} data-ai-hint="user profile avatar" />
            <AvatarFallback className="text-sm">{getInitials(notification.actorName)}</AvatarFallback>
          </Avatar>
        ) : (
          <NotificationIcon type={notification.type} />
        )}
      </div>
      <div className="flex-grow min-w-0">
        {notification.actorName && (
          <span className="font-semibold text-sm text-foreground block truncate">{notification.actorName}</span>
        )}
        <p className={cn(
          "text-sm break-words",
          notification.isRead ? "text-muted-foreground" : "text-foreground",
          notification.actorName ? "mt-0.5" : ""
        )}>
          {translatedMessage}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: currentLocale === 'es' ? es : enUS })}
        </p>
      </div>
    </div>
  );

  if (notification.link) {
    return (
      <Link 
        href={notification.link}
        onClick={handleNotificationClick} 
        className="block no-underline text-current"
      >
        {content}
      </Link>
    );
  }

  return (
    <div onClick={handleNotificationClick}>
      {content}
    </div>
  );
};


export default function NotificationBell() {
  const { notifications, unreadCount, isLoading, toggleReadStatus } = useDexieNotifications();
  const { t, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  // Take latest 20 notifications for display
  const displayNotifications = notifications.slice(0, 20);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t('Notifications.ariaLabelOpen')}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <DropdownMenuLabel className="font-headline">{t('Notifications.dropdownTitle')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-80">
          {isLoading && displayNotifications.length === 0 && (
            <DropdownMenuItem disabled className="flex justify-center py-4">
              <p className="text-sm text-muted-foreground">{t('Notifications.loading')}</p>
            </DropdownMenuItem>
          )}
          {!isLoading && displayNotifications.length === 0 && (
            <DropdownMenuItem disabled className="flex justify-center py-4">
              <p className="text-sm text-muted-foreground">{t('Notifications.noNotifications')}</p>
            </DropdownMenuItem>
          )}
          {displayNotifications.map(notification => (
            <DropdownMenuItem key={notification.id} className="p-0 focus:bg-transparent" asChild>
                <NotificationItem 
                    notification={notification} 
                    onMarkAsRead={toggleReadStatus}
                    translate={t}
                    currentLocale={currentLocale}
                />
            </DropdownMenuItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
