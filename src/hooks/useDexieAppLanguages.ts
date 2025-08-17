
// src/hooks/useDexieAppLanguages.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { AppLanguage, TranslationRecord } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { toast } from './use-toast';

const generateId = () => `temp-${crypto.randomUUID()}`;
let isPopulating = false;

async function translateAndPopulate(newLangCode: string) {
    const allTranslations = await db.translations.toArray();
    const sourceLang = 'en'; // Assuming 'en' is the source of truth

    const translationsToUpdate: TranslationRecord[] = [];

    for (const record of allTranslations) {
        const sourceText = record.values[sourceLang];
        if (sourceText && !record.values[newLangCode]) {
            try {
                const response = await fetch('/api/translations/translate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: sourceText, targetLangs: [newLangCode], sourceLang }),
                });
                const result = await response.json();
                if (result.success && result.translations[newLangCode]) {
                    record.values[newLangCode] = result.translations[newLangCode];
                    translationsToUpdate.push(record);
                }
            } catch (e) {
                console.error(`Failed to translate key ${record.keyPath} to ${newLangCode}`, e);
            }
        }
    }

    if (translationsToUpdate.length > 0) {
        await db.translations.bulkPut(translationsToUpdate);
        for(const record of translationsToUpdate) {
            await syncService.addToQueue({ entity: 'translation', operation: 'update', data: { keyPath: record.keyPath, valuesToUpdate: record.values } });
        }
    }
}


export function useDexieAppLanguages() {
  const [isLoading, setIsLoading] = useState(true);

  const appLanguages = useLiveQuery(() => db.appLanguages.toArray(), []);

  const populateInitialData = useCallback(async () => {
    if (isPopulating) return;

    const count = await db.appLanguages.count();
    if (count > 0) {
      setIsLoading(false);
      return;
    }

    isPopulating = true;
    setIsLoading(true);
    try {
      const response = await fetch('/api/languages');
      if (!response.ok) throw new Error('Failed to fetch initial app languages');
      const result = await response.json();
      if (result.success) {
        await db.appLanguages.bulkAdd(result.data);
      } else {
        throw new Error(result.error || 'API error fetching initial app languages');
      }
    } catch (error) {
      console.warn("[useDexieAppLanguages] Failed to populate initial data (likely offline):", error);
    } finally {
      setIsLoading(false);
      isPopulating = false;
    }
  }, []);

  useEffect(() => {
    populateInitialData();
  }, [populateInitialData]);

  const addLanguage = async (newLang: Omit<AppLanguage, 'id'>) => {
    const tempId = generateId();
    const langWithId: AppLanguage = {
      ...newLang,
      id: tempId,
    };
    await db.appLanguages.add(langWithId);
    await syncService.addToQueue({ entity: 'appLanguage', operation: 'create', data: langWithId });

    // Trigger auto-translation
    const keyRes = await fetch('/api/settings/translate');
    const keyData = await keyRes.json();
    if(keyData.success && keyData.data.isKeySet) {
        toast({ title: "Auto-translation started", description: `Translating all keys to ${newLang.name}...` });
        translateAndPopulate(newLang.code).then(() => {
            toast({ title: "Auto-translation complete", description: `Finished translating to ${newLang.name}.` });
        });
    }
  };

  const updateLanguage = async (updatedLang: AppLanguage) => {
    // If setting a new default, unset the old one locally first.
    if (updatedLang.isDefault) {
        const oldDefault = await db.appLanguages.filter(lang => !!lang.isDefault).first();
        if (oldDefault && oldDefault.id !== updatedLang.id) {
            await db.appLanguages.update(oldDefault.id, { isDefault: false });
        }
    }
    await db.appLanguages.put(updatedLang);
    await syncService.addToQueue({ entity: 'appLanguage', operation: 'update', data: updatedLang });
  };

  const deleteLanguage = async (id: string) => {
    await db.appLanguages.delete(id);
    await syncService.addToQueue({ entity: 'appLanguage', operation: 'delete', data: { id } });
  };

  return { appLanguages: appLanguages || [], isLoading: isLoading || appLanguages === undefined, refetch: populateInitialData, addLanguage, updateLanguage, deleteLanguage };
}
