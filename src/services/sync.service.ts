
// src/services/sync.service.ts
import { db } from '@/lib/dexie-db';
import type { SyncQueueItem } from '@/lib/dexie-db';
import { BehaviorSubject, type Observable } from 'rxjs';

const SYNC_INTERVAL = 30000; // 30 seconds
let syncIntervalId: NodeJS.Timeout | null = null;

const entityToEndpointMap: Record<string, string> = {
  product: 'products',
  client: 'clients',
  supplier: 'suppliers',
  promotion: 'promotions',
  tax: 'taxes',
  paymentMethod: 'payment-methods',
  country: 'countries',
  currency: 'currencies',
  appLanguage: 'languages',
  theme: 'themes',
  user: 'users',
  notification: 'notifications',
  posSetting: 'pos-settings',
  receiptSetting: 'receipt-settings',
  smtpSetting: 'settings/smtp',
  aiSetting: 'settings/ai',
  sale: 'sales',
  return: 'returns',
  rolePermission: 'role-permissions',
  translation: 'translations/item',
};

const singletonEntities = ['posSetting', 'receiptSetting', 'smtpSetting', 'aiSetting'];

type SyncStatus = 'idle' | 'syncing' | 'offline';
type SyncTrigger = 'interval' | 'onlineEvent' | 'manual';

class SyncService {
  private isSyncing = false;
  private statusSubject = new BehaviorSubject<SyncStatus>(typeof navigator !== 'undefined' && navigator.onLine ? 'idle' : 'offline');
  public status$: Observable<SyncStatus> = this.statusSubject.asObservable();

  public getStatus(): SyncStatus {
    return this.statusSubject.getValue();
  }

  private updateStatus(status: SyncStatus) {
    if (this.statusSubject.getValue() !== status) {
      this.statusSubject.next(status);
    }
  }

  private handleOnline = () => {
    console.log('[SyncService] App is online.');
    this.updateStatus('idle');
    this.syncWithBackend('onlineEvent');
  };
  
  private handleOffline = () => {
    console.log('[SyncService] App is offline.');
    this.updateStatus('offline');
  };

  async addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp'>) {
    try {
      await db.syncQueue.add({
        ...item,
        timestamp: Date.now(),
      });
      console.log(`[SyncService] Added ${item.operation} for ${item.entity} to queue.`);
      // No need to trigger sync immediately, interval will handle it
    } catch (error) {
      console.error("[SyncService] Error adding to queue:", error);
    }
  }

  async syncWithBackend(trigger: SyncTrigger = 'interval') {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        this.updateStatus('offline');
        return;
    }
    if (this.isSyncing) {
      console.log(`[SyncService] Skipping sync. A sync process is already running.`);
      return;
    }

    this.isSyncing = true;
    this.updateStatus('syncing');
    console.log(`[SyncService] Starting sync with backend (triggered by: ${trigger})...`);

    const queueItems = await db.syncQueue.orderBy('timestamp').toArray();
    if (queueItems.length === 0) {
      console.log("[SyncService] Sync queue is empty.");
      this.isSyncing = false;
      this.updateStatus('idle');
      return;
    }
    
    console.log(`[SyncService] Found ${queueItems.length} items to sync.`);
    const failedItems: { item: SyncQueueItem, reason: string }[] = [];

    for (const item of queueItems) {
        try {
            const endpointPath = entityToEndpointMap[item.entity];
            if (!endpointPath) {
                throw new Error(`No endpoint mapping for entity: ${item.entity}.`);
            }

            let endpoint = `/api/${endpointPath}`;
            let method = 'POST';
            let body: string | undefined = JSON.stringify(item.data);
            
            if (item.operation === 'update') {
              method = 'PUT';
              if (singletonEntities.includes(item.entity)) {
                method = 'POST';
              } else if (item.entity === 'rolePermission') {
                  endpoint = `/api/role-permissions/${item.data.role}`;
                  method = 'PUT';
              } else if (item.entity === 'notification') {
                  // The toggle read status action is a POST to the item's endpoint
                  method = 'POST';
                  endpoint = `/api/notifications/${item.data.id}`;
                  body = undefined; // No body needed for this specific action
              } else if (item.entity === 'translation') {
                  method = 'PUT';
              } else if (item.data.id) {
                endpoint = `${endpoint}/${item.data.id}`;
              } else {
                throw new Error(`Update operation for ${item.entity} is missing an ID.`);
              }
            } else if (item.operation === 'delete') {
              method = 'DELETE';
              if (item.data.id) {
                 endpoint = `${endpoint}/${item.data.id}`;
                 body = undefined; // No body for DELETE
              } else {
                 throw new Error(`Delete operation for ${item.entity} is missing an ID.`);
              }
            } else if(item.operation === 'create' && item.entity === 'return') {
                method = 'POST';
            }
            
            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body,
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    await db.syncQueue.delete(item.id!);
                    console.log(`[SyncService] Synced ${item.operation} for ${item.entity} ID ${item.data.id || '(new)'}`);
                } else {
                    throw new Error(`Backend error for ${item.entity}: ${result.error}`);
                }
            } else {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

        } catch (error) {
            const reason = error instanceof Error ? error.message : 'Unknown error';
            failedItems.push({ item, reason });
            console.error(`[SyncService] Failed to process item ID ${item.id} for entity ${item.entity}. Reason: ${reason}`);
        }
    }

    if (failedItems.length > 0) {
        console.error(`[SyncService] Finished sync with ${failedItems.length} failures. Failed items:`, 
            failedItems.map(f => ({
                itemId: f.item.id,
                entity: f.item.entity,
                operation: f.item.operation,
                dataId: f.item.data.id,
                reason: f.reason
            }))
        );
    }

    this.isSyncing = false;
    console.log("[SyncService] Sync finished.");
    this.updateStatus(typeof navigator !== 'undefined' && navigator.onLine ? 'idle' : 'offline');
  }

  start() {
    if (syncIntervalId !== null) return;
    
    syncIntervalId = setInterval(() => this.syncWithBackend('interval'), SYNC_INTERVAL);
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    console.log('[SyncService] Sync process started.');
    // Initial check
    this.updateStatus(navigator.onLine ? 'idle' : 'offline');
    if (navigator.onLine) {
        this.syncWithBackend('manual');
    }
  }

  stop() {
    if (syncIntervalId) clearInterval(syncIntervalId);
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    syncIntervalId = null;
    console.log('[SyncService] Sync process stopped.');
  }
}

export const syncService = new SyncService();
