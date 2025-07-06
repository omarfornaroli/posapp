
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Bell, Loader2, CheckCircle2, XCircle, ChevronLeft, ChevronRight, ListFilter, Download, Upload, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useDexieNotifications } from '@/hooks/useDexieNotifications';
import NotificationListTable from '@/components/notifications/NotificationListTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function NotificationsManagerPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const { notifications: allNotifications, isLoading, toggleReadStatus, deleteNotification } = useDexieNotifications();
  
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { toast } = useToast();

  const handleMarkAllRead = async () => {
    toast({ title: t('Common.featureComingSoonTitle'), description: t('NotificationsManagerPage.markAllReadComingSoon') });
  };

  const handleDeleteAllRead = async () => {
    toast({ title: t('Common.featureComingSoonTitle'), description: t('NotificationsManagerPage.deleteAllReadComingSoon') });
  };
  
  const handleExport = () => {
    if (allNotifications.length === 0) {
      toast({ title: t('NotificationsManagerPage.noDataToExportTitle'), variant: 'default'});
      return;
    }
    const jsonString = JSON.stringify(allNotifications, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "notifications_export.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: t('Toasts.exportSuccessTitle'), description: t('Toasts.exportSuccessDescriptionNotifications', { count: allNotifications.length }) });
  };
  
  const handleImport = () => {
     toast({
        title: t('Common.error'),
        description: t('NotificationsManagerPage.importNotSupported'),
        variant: 'destructive',
    });
  }

  const filteredNotifications = useMemo(() => {
    if (!searchTerm) return allNotifications;
    const lowercasedTerm = searchTerm.toLowerCase();
    return allNotifications.filter(notif => 
      t(notif.messageKey, notif.messageParams).toLowerCase().includes(lowercasedTerm) ||
      notif.actorName?.toLowerCase().includes(lowercasedTerm)
    );
  }, [allNotifications, searchTerm, t]);

  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredNotifications.slice(startIndex, startIndex + pageSize);
  }, [filteredNotifications, currentPage, pageSize]);
  
  const totalPages = Math.ceil(filteredNotifications.length / pageSize);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
    } else if (totalPages === 0) {
        setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  if (isLoadingTranslations) {
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
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button onClick={handleImport} variant="outline" size="icon" aria-label={t('ProductManagementPage.importProductsButton')}>
                          <Upload className="h-5 w-5" />
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{t('ProductManagementPage.importProductsButton')}</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button onClick={handleExport} variant="outline" size="icon" aria-label={t('ProductManagementPage.exportProductsButton')}>
                          <Download className="h-5 w-5" />
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{t('ProductManagementPage.exportProductsButton')}</p></TooltipContent>
              </Tooltip>
          </TooltipProvider>
          <Button onClick={handleMarkAllRead} variant="outline">
            <CheckCircle2 className="mr-2 h-5 w-5" /> {t('NotificationsManagerPage.markAllReadButton')}
          </Button>
          <Button onClick={handleDeleteAllRead} variant="destructive" className="border-destructive text-destructive-foreground hover:bg-destructive/90">
            <XCircle className="mr-2 h-5 w-5" /> {t('NotificationsManagerPage.deleteAllReadButton')}
          </Button>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardContent className="pt-6">
           <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('NotificationsManagerPage.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full max-w-sm"
            />
          </div>
          {isLoading && paginatedNotifications.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <NotificationListTable
              notifications={paginatedNotifications}
              onToggleRead={toggleReadStatus}
              onDelete={deleteNotification}
            />
          )}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {t('NotificationsManagerPage.paginationSummary', {
                start: Math.min((currentPage - 1) * pageSize + 1, filteredNotifications.length),
                end: Math.min(currentPage * pageSize, filteredNotifications.length),
                total: filteredNotifications.length
              })}
            </p>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    {t('NotificationsManagerPage.rowsPerPage', {count: pageSize})} <ListFilter className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t('NotificationsManagerPage.selectRowsPerPage')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                    {ITEMS_PER_PAGE_OPTIONS.map(size => (
                      <DropdownMenuRadioItem key={size} value={String(size)}>{size}</DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage <= 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
