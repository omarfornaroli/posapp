// src/hooks/useSyncStatus.ts
import { useState, useEffect } from 'react';
import { syncService } from '@/services/sync.service';

type SyncStatus = 'idle' | 'syncing' | 'offline';

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(syncService.getStatus());

  useEffect(() => {
    const subscription = syncService.status$.subscribe(setStatus);
    return () => subscription.unsubscribe();
  }, []);

  return status;
}
