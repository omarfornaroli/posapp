// src/components/layout/SyncStatusIndicator.tsx
'use client';

import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Cloud, CloudUpload, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

export default function SyncStatusIndicator() {
  const status = useSyncStatus();
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();

  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  if (isLoadingTranslations) {
    return <div className="w-10 h-10 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  
  const getStatusInfo = () => {
    switch (status) {
      case 'syncing':
        return {
          Icon: CloudUpload,
          color: 'text-yellow-500 animate-pulse',
          tooltip: t('SyncStatus.syncing'),
        };
      case 'offline':
        return {
          Icon: CloudOff,
          color: 'text-muted-foreground',
          tooltip: t('SyncStatus.offline'),
        };
      case 'idle':
      default:
        return {
          Icon: Cloud,
          color: 'text-green-500',
          tooltip: t('SyncStatus.idle'),
        };
    }
  };

  const { Icon, color, tooltip } = getStatusInfo();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center justify-center h-10 w-10">
           <Icon className={cn("h-5 w-5", color)} />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
