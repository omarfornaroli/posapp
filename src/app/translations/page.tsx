

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useDexieTranslations } from '@/hooks/useDexieTranslations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Languages, Check, Search, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { TranslationDexieRecord } from '@/lib/dexie-db';

type EditableTranslation = TranslationDexieRecord & { isDirty?: boolean };

export default function TranslationsManagerPage() {
  const { t } = useRxTranslate();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  
  const { translations: dexieTranslations, isLoading, updateTranslation } = useDexieTranslations();
  
  const [editableTranslations, setEditableTranslations] = useState<EditableTranslation[]>([]);
  const [activeLocales, setActiveLocales] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [isApiKeySet, setIsApiKeySet] = useState(false);

  useEffect(() => {
      if (dexieTranslations) {
          setEditableTranslations(dexieTranslations.map(t => ({...t})));
      }
  }, [dexieTranslations]);

  useEffect(() => {
    async function checkKeyStatus() {
        try {
            const keyResponse = await fetch('/api/settings/ai');
            const keyResult = await keyResponse.json();
            setIsApiKeySet(keyResult.success && keyResult.data.isKeySet);
        } catch (e) {
            console.error("Could not verify AI Key status", e);
            setIsApiKeySet(false);
        }
    }
    checkKeyStatus();
  }, []);

  const handleInputChange = (keyPath: string, locale: string, value: string) => {
    setEditableTranslations(prev =>
      prev.map(t =>
        t.keyPath === keyPath
          ? { ...t, values: { ...t.values, [locale]: value }, isDirty: true }
          : t
      )
    );
  };
  
  const handleSave = async (keyPath: string) => {
    const translationToSave = editableTranslations.find(t => t.keyPath === keyPath);
    if (!translationToSave || !translationToSave.isDirty) return;
    
    try {
        const { isDirty, ...dbRecord } = translationToSave;
        await updateTranslation(dbRecord);
        
        setEditableTranslations(prev => prev.map(t => t.keyPath === keyPath ? {...t, isDirty: false} : t));
        toast({ title: t('TranslationsManagerPage.saveSuccessTitle'), description: t('TranslationsManagerPage.saveSuccessDescription', {key: keyPath}) });

    } catch(e) {
        toast({ variant: 'destructive', title: t('Common.error'), description: e instanceof Error ? e.message : 'Unknown error' });
    }
  };

  const handleAutoTranslateRow = async (keyPath: string) => {
    const translationItem = editableTranslations.find(t => t.keyPath === keyPath);
    if (!translationItem) return;

    const sourceLang = 'en'; // Assuming English is the source of truth
    const sourceText = translationItem.values[sourceLang];
    if (!sourceText) {
      toast({ variant: 'destructive', title: t('Common.error'), description: t('TranslationsManagerPage.errorNoSourceText') });
      return;
    }

    const targetLocales = activeLocales.filter(loc => loc !== sourceLang && !translationItem.values[loc]);

    if (targetLocales.length === 0) {
      toast({ title: t('Common.info'), description: t('TranslationsManagerPage.infoNoLanguagesToTranslate') });
      return;
    }
    
    try {
      const response = await fetch('/api/translations/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText, targetLangs: targetLocales, sourceLang }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      setEditableTranslations(prev =>
        prev.map(t =>
          t.keyPath === keyPath
            ? { ...t, values: { ...t.values, ...result.translations }, isDirty: true }
            : t
        )
      );

    } catch(e) {
      toast({ variant: 'destructive', title: t('Common.error'), description: e instanceof Error ? e.message : 'Translation failed' });
    }
  };
  
  const filteredTranslations = useMemo(() => {
    if (!debouncedSearchTerm) return editableTranslations;
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();
    return editableTranslations.filter(t => 
        t.keyPath.toLowerCase().includes(lowercasedTerm) || 
        Object.values(t.values).some(val => val.toLowerCase().includes(lowercasedTerm))
    );
  }, [editableTranslations, debouncedSearchTerm]);


  if (!hasPermission('manage_translations_page')) {
    return <AccessDeniedMessage />;
  }

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-headline font-semibold text-primary flex items-center">
            <Languages className="mr-3 h-8 w-8" /> {t('TranslationsManagerPage.title')}
        </h1>
        {isApiKeySet && (
            <Alert variant="default" className="bg-blue-50 border-blue-200">
                <Sparkles className="h-4 w-4 !text-blue-600" />
                <AlertTitle className="text-blue-800">{t('TranslationsManagerPage.autoTranslateTitle')}</AlertTitle>
                <AlertDescription className="text-blue-700">
                    {t('TranslationsManagerPage.autoTranslateDescription')}
                </AlertDescription>
            </Alert>
        )}
        <Card className="shadow-xl">
            <CardHeader>
                <CardTitle>{t('TranslationsManagerPage.listTitle')}</CardTitle>
                <CardDescription>{t('TranslationsManagerPage.listDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder={t('TranslationsManagerPage.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-full max-w-sm"/>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                ) : (
                    <ScrollArea className="h-[calc(100vh-28rem)] border rounded-md">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card z-10">
                                <TableRow>
                                    <TableHead className="min-w-[200px]">{t('TranslationsManagerPage.keyPathHeader')}</TableHead>
                                    {activeLocales.map(locale => (
                                        <TableHead key={locale} className="min-w-[250px] uppercase">{locale}</TableHead>
                                    ))}
                                    <TableHead className="w-[100px] text-center">{t('Common.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {filteredTranslations.map(item => (
                                    <TableRow key={item.keyPath}>
                                        <TableCell className="font-mono text-xs">{item.keyPath}</TableCell>
                                        {activeLocales.map(locale => (
                                            <TableCell key={locale}>
                                                <Input
                                                    value={item.values[locale] || ''}
                                                    onChange={(e) => handleInputChange(item.keyPath, locale, e.target.value)}
                                                    className="h-8"
                                                />
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-center space-x-1">
                                            {isApiKeySet && (
                                              <Button size="icon" variant="ghost" onClick={() => handleAutoTranslateRow(item.keyPath)} className="h-8 w-8 text-blue-500 hover:text-blue-600"><Sparkles className="h-4 w-4"/></Button>
                                            )}
                                            <Button size="icon" variant="ghost" onClick={() => handleSave(item.keyPath)} disabled={!item.isDirty} className={cn("h-8 w-8", !item.isDirty && "text-green-600 hover:text-green-700")}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    </div>
  );
}

