// src/hooks/useSyncStatus.ts
import { useState, useEffect } from 'react';
import { syncService } from '@/services/sync.service';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Cloud, CloudUpload, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type SyncStatus = 'idle' | 'syncing' | 'offline';

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(() => 
    typeof navigator !== 'undefined' && navigator.onLine ? 'idle' : 'offline'
  );

  useEffect(() => {
    // Set initial status correctly
    setStatus(typeof navigator !== 'undefined' && navigator.onLine ? 'idle' : 'offline');
    
    const subscription = syncService.status$.subscribe(setStatus);
    
    // Add event listeners to react to system changes immediately
    const handleOnline = () => setStatus('idle');
    const handleOffline = () => setStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}
