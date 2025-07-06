// src/hooks/useDexieSmtpSettings.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import type { SmtpSetting } from '@/types';
import { useState, useEffect, useCallback } from 'react';

const SINGLETON_KEY = 'global_smtp_settings';
let isPopulating = false;

interface SmtpSettingsWithStatus extends SmtpSetting {
    isConfigured?: boolean;
}

export function useDexieSmtpSettings() {
  const [isLoading, setIsLoading] = useState(true);

  const smtpSettings = useLiveQuery(async () => {
    const settings = await db.smtpSettings.get(SINGLETON_KEY);
    if (!settings) return null;
    return { ...settings, isConfigured: !!(settings.host && settings.port && settings.user) } as SmtpSettingsWithStatus;
  }, []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const setting = await db.smtpSettings.get(SINGLETON_KEY);
    if (setting) {
      setIsLoading(false);
      return;
    }

    isPopulating = true;
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/smtp');
      if (!response.ok) throw new Error('Failed to fetch initial smtp settings');
      const result = await response.json();
      if (result.success) {
        await db.smtpSettings.put(result.data);
      } else {
        throw new Error(result.error || 'API error fetching initial smtp settings');
      }
    } catch (error) {
      console.warn("[useDexieSmtpSettings] Failed to populate initial data (likely offline):", error);
    } finally {
      setIsLoading(false);
      isPopulating = false;
    }
  }, []);
  
  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  return { smtpSettings, isLoading: isLoading || smtpSettings === undefined, refetch: populateInitialData };
}
