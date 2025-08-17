
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Loader2, Download, Upload, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Notification } from '@/types';
import { useDexieNotifications } from '@/hooks/useDexieNotifications';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import NotificationListTable from '@/components/notifications/NotificationListTable';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function NotificationsManagerPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { notifications, isLoading, toggleReadStatus, deleteNotification } = useDexieNotifications();
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50; 
  
  const { toast } = useToast();

  const handleComingSoon = (featureName: string) => {
    toast({
        title: t('Common.featureComingSoonTitle'),
        description: t(`NotificationsManagerPage.${featureName}ComingSoon`),
    });
  };

  const handleDelete = async (notificationId: string) => {
      try {
        await deleteNotification(notificationId);
        toast({ title: t('NotificationsManagerPage.notificationDeletedTitle'), description: t('NotificationsManagerPage.notificationDeletedDescription') });
      } catch(e) {
          toast({ variant: 'destructive', title: t('Common.error'), description: t('NotificationsManagerPage.errorDeletingNotificationApi') });
      }
  };

  const handleToggleRead = async (notificationId: string) => {
    try {
        await toggleReadStatus(notificationId);
    } catch(e) {
        toast({ variant: 'destructive', title: t('Common.error'), description: t('NotificationsManagerPage.errorUpdatingStatusApi') });
    }
  };


  if (!hasPermission('manage_notifications_page')) {
    return <AccessDeniedMessage />;
  }

  const isLoadingData = isLoadingTranslations || isLoading;

  if (isLoadingData && notifications.length === 0) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,64px)-4rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <Bell className="mr-3 h-8 w-8" /> {t('NotificationsManagerPage.title')}
        </h1>
        <div className="flex gap-2">
            <TooltipProvider>
                <Tooltip><TooltipTrigger asChild><Button onClick={() => handleComingSoon('MarkAllRead')} variant="outline" size="sm">{t('NotificationsManagerPage.markAllReadButton')}</Button></TooltipTrigger><TooltipContent><p>{t('NotificationsManagerPage.markAllReadComingSoon')}</p></TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button onClick={() => handleComingSoon('DeleteAllRead')} variant="destructive" size="sm">{t('NotificationsManagerPage.deleteAllReadButton')}</Button></TooltipTrigger><TooltipContent><p>{t('NotificationsManagerPage.deleteAllReadComingSoon')}</p></TooltipContent></Tooltip>
            </TooltipProvider>
        </div>
      </div>
      
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>{t('NotificationsManagerPage.notificationListTitle')}</CardTitle>
          <CardDescription>{t('NotificationsManagerPage.description')}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
            <NotificationListTable notifications={notifications} onToggleRead={handleToggleRead} onDelete={handleDelete}/>
        </CardContent>
      </Card>
    </div>
  );
}
