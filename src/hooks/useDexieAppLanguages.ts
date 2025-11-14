// src/hooks/useDexieAppLanguages.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';
import type { AppLanguage, TranslationRecord } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { toast } from './use-toast';
import { getApiPath } from '@/lib/utils';

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

async function translateAndPopulate(newLangCode: string) {
    const allTranslations = await db.translations.toArray();
    const sourceLang = 'en'; // Assuming 'en' is the source of truth

    const translationsToUpdate: TranslationRecord[] = [];

    for (const record of allTranslations) {
        const sourceText = record.values[sourceLang];
        if (sourceText && !record.values[newLangCode]) {
            try {
                const response = await fetch(getApiPath('/api/translations/translate'), {
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
  const appLanguages = useLiveQuery(() => db.appLanguages.toArray(), []);
  const isLoading = appLanguages === undefined;

  const addLanguage = async (newLang: Omit<AppLanguage, 'id'>) => {
    const tempId = generateId();
    const now = new Date().toISOString();
    const langWithId: AppLanguage = {
      ...newLang,
      id: tempId,
      createdAt: now,
      updatedAt: now,
    };
    await db.appLanguages.add(langWithId);
    await syncService.addToQueue({ entity: 'appLanguage', operation: 'create', data: langWithId });

    // Trigger auto-translation
    const keyRes = await fetch(getApiPath('/api/settings/ai'));
    const keyData = await keyRes.json();
    if(keyData.success && keyData.data.isKeySet) {
        toast({ title: "Auto-translation started", description: `Translating all keys to ${newLang.name}...` });
        translateAndPopulate(newLang.code).then(() => {
            toast({ title: "Auto-translation complete", description: `Finished translating to ${newLang.name}.` });
        });
    }
  };

  const updateLanguage = async (updatedLang: AppLanguage) => {
    const langToUpdate = { ...updatedLang, updatedAt: new Date().toISOString() };
    if (updatedLang.isDefault) {
        const oldDefault = await db.appLanguages.filter(lang => !!lang.isDefault).first();
        if (oldDefault && oldDefault.id !== updatedLang.id) {
            await db.appLanguages.update(oldDefault.id, { isDefault: false });
            await syncService.addToQueue({ entity: 'appLanguage', operation: 'update', data: { ...oldDefault, isDefault: false, updatedAt: new Date().toISOString() } });
        }
    }
    await db.appLanguages.put(langToUpdate);
    await syncService.addToQueue({ entity: 'appLanguage', operation: 'update', data: langToUpdate });
  };

  const deleteLanguage = async (id: string) => {
    await db.appLanguages.delete(id);
    await syncService.addToQueue({ entity: 'appLanguage', operation: 'delete', data: { id } });
  };

  return { appLanguages: appLanguages || [], isLoading, addLanguage, updateLanguage, deleteLanguage };
}