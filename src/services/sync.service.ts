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
};

type SyncStatus = 'idle' | 'syncing' | 'offline';

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
    this.syncWithBackend();
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
      this.syncWithBackend();
    } catch (error) {
      console.error("[SyncService] Error adding to queue:", error);
    }
  }

  async syncWithBackend() {
    if (this.isSyncing || !navigator.onLine) {
      console.log(`[SyncService] Skipping sync. Syncing: ${this.isSyncing}, Online: ${navigator.onLine}`);
      if (!navigator.onLine) this.updateStatus('offline');
      return;
    }

    this.isSyncing = true;
    this.updateStatus('syncing');
    console.log("[SyncService] Starting sync with backend...");

    const queueItems = await db.syncQueue.orderBy('timestamp').toArray();
    if (queueItems.length === 0) {
      console.log("[SyncService] Sync queue is empty.");
      this.isSyncing = false;
      this.updateStatus('idle');
      return;
    }

    const operationsByEntity: Record<string, SyncQueueItem[]> = {};
    for (const item of queueItems) {
        if (!operationsByEntity[item.entity]) {
            operationsByEntity[item.entity] = [];
        }
        operationsByEntity[item.entity].push(item);
    }

    try {
      for (const entity in operationsByEntity) {
        const operations = operationsByEntity[entity];
        const endpointPath = entityToEndpointMap[entity];
        if (operations.length > 0 && endpointPath) {
            const endpoint = `/api/${endpointPath}/sync`;
            console.log(`[SyncService] Syncing ${operations.length} operations for entity: ${entity} to endpoint: ${endpoint}`);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(operations.map(({ id, ...op }) => op)),
            });

            if (!response.ok) {
                console.error(`[SyncService] Sync for ${entity} failed with status ${response.status}`);
                continue; 
            }

            const result = await response.json();
            if (result.success) {
                const processedIds = operations.map(item => item.id).filter(id => id !== undefined) as number[];
                await db.syncQueue.bulkDelete(processedIds);
                console.log(`[SyncService] Successfully synced and cleared ${processedIds.length} ${entity} operations.`);
            } else {
                console.error(`[SyncService] Backend reported error on ${entity} sync:`, result.error);
            }
        }
      }
    } catch (error) {
      console.error("[SyncService] General error during sync process:", error);
    } finally {
      this.isSyncing = false;
      console.log("[SyncService] Sync finished.");
      this.updateStatus(navigator.onLine ? 'idle' : 'offline');
    }
  }

  start() {
    if (syncIntervalId !== null) return;
    
    syncIntervalId = setInterval(() => this.syncWithBackend(), SYNC_INTERVAL);
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    console.log('[SyncService] Sync process started.');
    // Initial check
    this.updateStatus(navigator.onLine ? 'idle' : 'offline');
    if (navigator.onLine) {
        this.syncWithBackend();
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
