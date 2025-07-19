
'use client';

import React, { useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Notification as NotificationType } from '@/types';
import { Eye, Trash2, CheckCircle2, XCircle, Info, AlertTriangle, ExternalLink, Loader2, MoreVertical } from 'lucide-react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from '@/lib/utils';

const NotificationIcon: React.FC<{ type: NotificationType['type'], className?: string }> = ({ type, className }) => {
  switch (type) {
    case 'success': return <CheckCircle2 className={cn("h-5 w-5 text-green-500", className)} />;
    case 'error': return <XCircle className={cn("h-5 w-5 text-destructive", className)} />;
    case 'warning': return <AlertTriangle className={cn("h-5 w-5 text-yellow-500", className)} />;
    case 'info':
    case 'system':
    default: return <Info className={cn("h-5 w-5 text-blue-500", className)} />;
  }
};

const NotificationCard = ({ notification, onToggleRead, onDelete, t, formatDate }: { notification: NotificationType, onToggleRead: (id: string) => void, onDelete: (id: string) => void, t: Function, formatDate: (d: string | undefined) => string }) => (
  <Card className={cn("mb-2", notification.isRead && "opacity-70 bg-muted/50")}>
    <CardHeader className="p-3 flex flex-row items-start justify-between">
      <div className="flex items-center gap-3">
        {notification.actorName ? (
          <Avatar className="h-9 w-9">
            <AvatarImage src={notification.actorImageUrl} alt={notification.actorName} data-ai-hint="user profile"/>
            <AvatarFallback>{getInitials(notification.actorName)}</AvatarFallback>
          </Avatar>
        ) : (
          <NotificationIcon type={notification.type} />
        )}
        <div>
          <CardTitle className="text-sm font-semibold">{notification.actorName || t('NotificationsManagerPage.actorSystem')}</CardTitle>
          <CardDescription className="text-xs">{formatDate(notification.createdAt)}</CardDescription>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2"><MoreVertical className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onToggleRead(notification.id)}>
            <Eye className="mr-2 h-4 w-4" /> {notification.isRead ? t('NotificationsManagerPage.markAsUnreadAria') : t('NotificationsManagerPage.markAsReadAria')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(notification.id)} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> {t('Common.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </CardHeader>
    <CardContent className="px-3 pb-3 text-sm">
      <p>{t(notification.messageKey, notification.messageParams)}</p>
       {notification.link && (
        <Link href={notification.link} passHref legacyBehavior>
          <a className="mt-2 text-primary hover:underline inline-flex items-center text-xs font-semibold">
            {t('NotificationsManagerPage.viewLink')} <ExternalLink className="h-3 w-3 ml-1"/>
          </a>
        </Link>
      )}
    </CardContent>
  </Card>
);

interface NotificationListTableProps {
  notifications: NotificationType[];
  onToggleRead: (notificationId: string) => void;
  onDelete: (notificationId: string) => void;
}

export default function NotificationListTable({ notifications, onToggleRead, onDelete }: NotificationListTableProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  if (isLoadingTranslations && (!notifications || notifications.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{t('NotificationsManagerPage.noNotificationsFound')}</p>;
  }

  const formatDate = (dateString: string | undefined) => {
    try {
      if (!dateString) return '';
      return format(new Date(dateString), 'PPpp', { locale: currentLocale === 'es' ? es : enUS });
    } catch (e) {
      return dateString || '';
    }
  };

  return (
    <>
      <div className="md:hidden">
        {notifications.map((notification) => (
          <NotificationCard 
            key={notification.id}
            notification={notification}
            onToggleRead={onToggleRead}
            onDelete={onDelete}
            t={t}
            formatDate={formatDate}
          />
        ))}
      </div>
      <div className="hidden md:block rounded-md border shadow-sm max-h-[calc(100vh-25rem)] overflow-auto relative">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-[40px] text-center font-semibold">#</TableHead>
              <TableHead className="w-[80px] text-center font-semibold">{t('NotificationsManagerPage.tableHeaderStatus')}</TableHead>
              <TableHead className="w-[60px] text-center font-semibold">{t('NotificationsManagerPage.tableHeaderType')}</TableHead>
              <TableHead className="w-[150px] font-semibold">{t('NotificationsManagerPage.tableHeaderActor')}</TableHead>
              <TableHead className="min-w-[300px] font-semibold">{t('NotificationsManagerPage.tableHeaderMessage')}</TableHead>
              <TableHead className="w-[180px] font-semibold">{t('NotificationsManagerPage.tableHeaderDate')}</TableHead>
              <TableHead className="w-[120px] text-center font-semibold">{t('NotificationsManagerPage.tableHeaderActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.map((notification, index) => (
              <TableRow key={notification.id} className={cn("hover:bg-muted/50", notification.isRead ? "opacity-70" : "")}>
                <TableCell className="text-center font-mono text-xs">{index + 1}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={notification.isRead ? 'outline' : 'default'}>
                    {notification.isRead ? t('NotificationsManagerPage.statusRead') : t('NotificationsManagerPage.statusUnread')}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <NotificationIcon type={notification.type} />
                </TableCell>
                <TableCell>
                  {notification.actorName ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={notification.actorImageUrl} alt={notification.actorName} data-ai-hint="user profile"/>
                        <AvatarFallback className="text-xs">{getInitials(notification.actorName)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium truncate">{notification.actorName}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t('NotificationsManagerPage.actorSystem')}</span>
                  )}
                </TableCell>
                <TableCell>
                  {t(notification.messageKey, notification.messageParams)}
                  {notification.link && (
                    <Link href={notification.link} passHref legacyBehavior>
                      <a className="ml-2 text-primary hover:underline inline-flex items-center text-xs">
                        ({t('NotificationsManagerPage.viewLink')}<ExternalLink className="h-3 w-3 ml-1"/>)
                      </a>
                    </Link>
                  )}
                </TableCell>
                <TableCell className="text-xs">{formatDate(notification.createdAt)}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onToggleRead(notification.id)} aria-label={notification.isRead ? t('NotificationsManagerPage.markAsUnreadAria') : t('NotificationsManagerPage.markAsReadAria')}>
                      {notification.isRead ? <Eye className="h-4 w-4 text-gray-500"/> : <Eye className="h-4 w-4 text-green-500"/>}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(notification.id)} aria-label={t('NotificationsManagerPage.deleteNotificationAria')}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
