
'use client';

import { useState, useEffect, useCallback } from 'react';
// import { useTranslations } from 'next-intl'; // Replaced by useRxTranslate
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Languages, Loader2, Save, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation'; 
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { useRxTranslate } from '@/hooks/use-rx-translate'; // Import the hook

interface EditableTranslationEntry {
  keyPath: string;
  currentValues: Record<string, string>; 
  originalValues: Record<string, string>;
  isSaving?: boolean;
}

export default function TranslationsManagerPage() {
  const { t, isLoading: isLoadingTranslationsHook, currentLocale, initializeTranslations } = useRxTranslate();
  const { toast } = useToast();
  const router = useRouter(); 
  const { hasPermission } = useAuth();

  const [editableTranslations, setEditableTranslations] = useState<EditableTranslationEntry[]>([]);
  const [activeLocalesForTable, setActiveLocalesForTable] = useState<string[]>(['en', 'es']); 
  const [isLoadingPageData, setIsLoadingPageData] = useState(true); // Separate loading state for page data
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    initializeTranslations(currentLocale); // Ensure RxTranslate is initialized with its current locale
  }, [initializeTranslations, currentLocale]);


  const fetchTranslationsData = useCallback(async () => {
    setIsLoadingPageData(true);
    try {
      const response = await fetch('/api/translations/all-details');
      if (!response.ok) {
        throw new Error('Failed to fetch translations from API');
      }
      const result = await response.json();
      if (result.success && result.data) {
        setActiveLocalesForTable(result.data.activeLocales || ['en', 'es']);
        const transformedData = result.data.translations.map((entry: { keyPath: string; values: Record<string, string> }) => ({
          keyPath: entry.keyPath,
          currentValues: { ...(entry.values || {}) },
          originalValues: { ...(entry.values || {}) },
          isSaving: false,
        }));
        setEditableTranslations(transformedData);
      } else {
        throw new Error(result.error || 'API returned unsuccessful status or no data');
      }
    } catch (error) {
      console.error("Error fetching translations:", error);
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('TranslationsManagerPage.errorFetchingTranslations'),
      });
      setEditableTranslations([]);
      setActiveLocalesForTable(['en', 'es']); 
    } finally {
      setIsLoadingPageData(false);
    }
  }, [toast, t]);

  useEffect(() => {
    if (hasPermission('manage_translations_page')) {
      fetchTranslationsData();
    }
  }, [fetchTranslationsData, hasPermission]);

  const handleTranslationChange = (keyPath: string, lang: string, value: string) => {
    setEditableTranslations(prev =>
      prev.map(entry =>
        entry.keyPath === keyPath
          ? { ...entry, currentValues: { ...entry.currentValues, [lang]: value } }
          : entry
      )
    );
  };

  const handleSaveTranslation = async (keyPath: string) => {
    const entryToSave = editableTranslations.find(entry => entry.keyPath === keyPath);
    if (!entryToSave) return;

    setEditableTranslations(prev =>
      prev.map(entry => (entry.keyPath === keyPath ? { ...entry, isSaving: true } : entry))
    );

    try {
      const response = await fetch('/api/translations/item', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyPath: entryToSave.keyPath,
          valuesToUpdate: entryToSave.currentValues, 
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || t('TranslationsManagerPage.errorSavingTranslation'));
      }
      toast({
        title: t('TranslationsManagerPage.saveSuccessTitle'),
        description: t('TranslationsManagerPage.saveSuccessDescription', { keyPath: entryToSave.keyPath }),
      });
      setEditableTranslations(prev =>
        prev.map(entry =>
          entry.keyPath === keyPath
            ? { ...entry, originalValues: { ...entry.currentValues }, isSaving: false }
            : entry
        )
      );
      // No router.refresh() needed as translation changes are now reactive through RxJS
      // but if the server needs to pick up changes for SSR on next load, one might consider
      // triggering a re-fetch of translations in translationRxService IF a specific key was updated
      // for the currently active language in the service. For now, this is a client-side immediate update.
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('TranslationsManagerPage.errorSavingTranslation'),
      });
      setEditableTranslations(prev =>
        prev.map(entry => (entry.keyPath === keyPath ? { ...entry, isSaving: false } : entry))
      );
    }
  };
  
  const getObjectDiff = (current: Record<string, string>, original: Record<string, string>): Record<string, string> => {
    const diff: Record<string, string> = {};
    const allKeys = new Set([...Object.keys(current), ...Object.keys(original)]);
    allKeys.forEach(key => {
      if (current[key] !== original[key]) {
        diff[key] = current[key];
      }
    });
    return diff;
  };

  const filteredTranslations = editableTranslations.filter(entry => {
    if (entry.keyPath.toLowerCase().includes(searchTerm.toLowerCase())) return true;
    for (const locale of activeLocalesForTable) {
        const currentValue = entry.currentValues[locale] || '';
        if (currentValue.toLowerCase().includes(searchTerm.toLowerCase())) return true;
    }
    return false;
  });

  if (!hasPermission('manage_translations_page')) {
    return <AccessDeniedMessage />;
  }

  // Use isLoadingTranslationsHook for the page's own translations (title, etc.)
  // Use isLoadingPageData for the table content
  if (isLoadingTranslationsHook || (isLoadingPageData && editableTranslations.length === 0)) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,64px)-4rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold text-primary flex items-center">
        <Languages className="mr-3 h-8 w-8" /> {t('TranslationsManagerPage.title')}
      </h1>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline">{t('TranslationsManagerPage.allTranslationsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-2">{t('TranslationsManagerPage.description')}</p>
          <p className="text-sm text-primary mb-4">{t('TranslationsManagerPage.editInstructions')}</p>
          <Input
            type="text"
            placeholder={t('TranslationsManagerPage.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          {isLoadingPageData ? (
            <div className="flex justify-center items-center h-[calc(100vh-30rem)]">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-30rem)] border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="font-semibold w-[40px] text-center whitespace-nowrap">*</TableHead>
                    <TableHead className="font-semibold min-w-[250px] whitespace-nowrap">{t('TranslationsManagerPage.tableHeaderKey')}</TableHead>
                    {activeLocalesForTable.map(locale => (
                      <TableHead key={locale} className="font-semibold min-w-[200px] whitespace-nowrap">{t(`TranslationsManagerPage.locale.${locale}` as any, {}, { fallback: locale.toUpperCase() })}</TableHead>
                    ))}
                    <TableHead className="font-semibold text-center w-[100px] whitespace-nowrap">{t('TranslationsManagerPage.tableHeaderActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTranslations.length === 0 && !isLoadingPageData && (
                    <TableRow>
                      <TableCell colSpan={activeLocalesForTable.length + 3} className="text-center text-muted-foreground py-8">
                         {searchTerm ? t('TranslationsManagerPage.noSearchResults') : t('TranslationsManagerPage.noTranslationsFound')}
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredTranslations.map((entry, index) => {
                    const diff = getObjectDiff(entry.currentValues, entry.originalValues);
                    const hasChanged = Object.keys(diff).length > 0;
                    return (
                      <TableRow key={entry.keyPath} className={
                        hasChanged ? 'bg-accent/20 hover:bg-accent/30' : 'hover:bg-muted/50'
                      }>
                        <TableCell className="font-mono text-xs py-2 align-top text-center">{index + 1}</TableCell>
                        <TableCell className="font-mono text-xs py-2 align-top whitespace-nowrap">
                          {entry.keyPath}
                        </TableCell>
                        {activeLocalesForTable.map(locale => (
                          <TableCell key={locale} className="py-2">
                            <Input
                              value={entry.currentValues[locale] || ''}
                              onChange={(e) => handleTranslationChange(entry.keyPath, locale, e.target.value)}
                              className="h-auto py-1 text-sm"
                              disabled={entry.isSaving}
                              placeholder={t('TranslationsManagerPage.missingTranslation', { locale: locale.toUpperCase() })}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="py-2 text-center">
                          <Button
                            size="sm"
                            onClick={() => handleSaveTranslation(entry.keyPath)}
                            disabled={entry.isSaving || !hasChanged}
                            className="bg-primary hover:bg-primary/90"
                          >
                            {entry.isSaving ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="mr-2 h-4 w-4" />
                            )}
                            {entry.isSaving ? t('TranslationsManagerPage.savingButton') : t('TranslationsManagerPage.saveButton')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
