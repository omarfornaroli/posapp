
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { db } from '@/lib/dexie-db';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { getApiPath } from '@/lib/utils';

interface SyncContextType {
  isInitialSyncComplete: boolean;
  syncStatusMessages: string[];
  startInitialSync: () => void;
}

const InitialSyncContext = createContext<SyncContextType | undefined>(undefined);

const syncOperations = [
  { key: 'users', model: db.users, endpoint: '/api/users' },
  { key: 'rolePermissions', model: db.rolePermissions, endpoint: '/api/role-permissions' },
  { key: 'countries', model: db.countries, endpoint: '/api/countries' },
  { key: 'currencies', model: db.currencies, endpoint: '/api/currencies' },
  { key: 'themes', model: db.themes, endpoint: '/api/themes' },
  { key: 'paymentMethods', model: db.paymentMethods, endpoint: '/api/payment-methods' },
  { key: 'taxes', model: db.taxes, endpoint: '/api/taxes' },
  { key: 'suppliers', model: db.suppliers, endpoint: '/api/suppliers' },
  { key: 'products', model: db.products, endpoint: '/api/products' },
  { key: 'promotions', model: db.promotions, endpoint: '/api/promotions' },
  { key: 'clients', model: db.clients, endpoint: '/api/clients' },
  { key: 'posSettings', model: db.posSettings, endpoint: '/api/pos-settings' },
  { key: 'receiptSettings', model: db.receiptSettings, endpoint: '/api/receipt-settings' },
  { key: 'smtpSettings', model: db.smtpSettings, endpoint: '/api/settings/smtp' },
  { key: 'aiSettings', model: db.aiSettings, endpoint: '/api/settings/ai' },
  { key: 'appLanguages', model: db.appLanguages, endpoint: '/api/languages' },
  { key: 'translations', model: db.translations, endpoint: '/api/translations/all'},
];

export function InitialSyncProvider({ children }: { children: ReactNode }) {
  const { t } = useRxTranslate();
  const [isInitialSyncComplete, setIsInitialSyncComplete] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('initialSyncCompleted') === 'true';
    }
    return false;
  });
  const [syncStatusMessages, setSyncStatusMessages] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const startInitialSync = useCallback(async () => {
    if (isSyncing || isInitialSyncComplete) return;

    setIsSyncing(true);
    setSyncStatusMessages([]);
    
    if (typeof window !== 'undefined' && !navigator.onLine) {
        console.log("Offline: Skipping initial sync.");
        setIsInitialSyncComplete(true); // Allow app to load with local data
        setIsSyncing(false);
        return;
    }

    const messages: string[] = [];

    for (const op of syncOperations) {
        const loadingMessage = t(`InitialSync.syncing${op.key.charAt(0).toUpperCase() + op.key.slice(1)}`, {}, { fallback: `Syncing ${op.key}...` }) + '...';
        messages.push(loadingMessage);
        setSyncStatusMessages([...messages]);

        try {
            const response = await fetch(getApiPath(op.endpoint));
            if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);
            
            const result = await response.json();
            if (result.success) {
                let dataToStore = result.data;
                // Special handling for translations which is nested
                if(op.key === 'translations' && result.data.translations) {
                   dataToStore = result.data.translations.map((entry: any) => ({
                      keyPath: entry.keyPath,
                      values: entry.values,
                    }));
                }
                
                if (Array.isArray(dataToStore)) {
                    await op.model.bulkPut(dataToStore);
                } else {
                    await op.model.put(dataToStore);
                }
            } else {
                throw new Error(result.error || `API error for ${op.key}`);
            }
            messages[messages.length - 1] = t(`InitialSync.synced${op.key.charAt(0).toUpperCase() + op.key.slice(1)}`, {}, { fallback: `${op.key} synced.` });
            setSyncStatusMessages([...messages]);
        } catch (error) {
            console.error(`[InitialSync] Failed to sync ${op.key}:`, error);
            messages[messages.length - 1] = t(`InitialSync.syncError${op.key.charAt(0).toUpperCase() + op.key.slice(1)}`, {}, { fallback: `Error syncing ${op.key}.` });
            setSyncStatusMessages([...messages]);
            // Continue with next sync item even if one fails
        }
    }
    
    localStorage.setItem('initialSyncCompleted', 'true');
    // A brief delay to allow user to see the "Done" messages before fading out
    setTimeout(() => {
        setIsInitialSyncComplete(true);
        setIsSyncing(false);
    }, 1000);

  }, [isSyncing, isInitialSyncComplete, t]);

  const value = useMemo(() => ({
    isInitialSyncComplete,
    syncStatusMessages,
    startInitialSync,
  }), [isInitialSyncComplete, syncStatusMessages, startInitialSync]);

  return (
    <InitialSyncContext.Provider value={value}>
      {children}
    </InitialSyncContext.Provider>
  );
}

export function useInitialSync() {
  const context = useContext(InitialSyncContext);
  if (context === undefined) {
    throw new Error('useInitialSync must be used within an InitialSyncProvider');
  }
  return context;
}
