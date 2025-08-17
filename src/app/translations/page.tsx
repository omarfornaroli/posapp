
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useDebounce } from 'use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Languages, Check, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { TranslationRecord } from '@/models/Translation';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { cn } from '@/lib/utils';

type EditableTranslation = {
  keyPath: string;
  values: { [key: string]: string };
  isDirty?: boolean;
};

export default function TranslationsManagerPage() {
  const { t } = useRxTranslate();
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const [translations, setTranslations] = useState<EditableTranslation[]>([]);
  const [activeLocales, setActiveLocales] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/translations/all-details');
      if (!response.ok) throw new Error('Failed to fetch translation data');
      const result = await response.json();
      if (result.success) {
        setTranslations(result.data.translations);
        setActiveLocales(result.data.activeLocales);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInputChange = (keyPath: string, locale: string, value: string) => {
    setTranslations(prev =>
      prev.map(t =>
        t.keyPath === keyPath
          ? { ...t, values: { ...t.values, [locale]: value }, isDirty: true }
          : t
      )
    );
  };
  
  const handleSave = async (keyPath: string) => {
    const translationToSave = translations.find(t => t.keyPath === keyPath);
    if (!translationToSave) return;
    
    try {
        const response = await fetch('/api/translations/item', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ keyPath, valuesToUpdate: translationToSave.values })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        
        setTranslations(prev => prev.map(t => t.keyPath === keyPath ? {...t, isDirty: false} : t));
        toast({ title: t('TranslationsManagerPage.saveSuccessTitle'), description: t('TranslationsManagerPage.saveSuccessDescription', {key: keyPath}) });

    } catch(e) {
        toast({ variant: 'destructive', title: t('Common.error'), description: e instanceof Error ? e.message : 'Unknown error' });
    }
  };
  
  const filteredTranslations = useMemo(() => {
    if (!debouncedSearchTerm) return translations;
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();
    return translations.filter(t => 
        t.keyPath.toLowerCase().includes(lowercasedTerm) || 
        Object.values(t.values).some(val => val.toLowerCase().includes(lowercasedTerm))
    );
  }, [translations, debouncedSearchTerm]);


  if (!hasPermission('manage_translations_page')) {
    return <AccessDeniedMessage />;
  }

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-headline font-semibold text-primary flex items-center">
            <Languages className="mr-3 h-8 w-8" /> {t('TranslationsManagerPage.title')}
        </h1>
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
                                        <TableCell className="text-center">
                                            <Button size="sm" onClick={() => handleSave(item.keyPath)} disabled={!item.isDirty} className={cn(!item.isDirty && "bg-green-600 hover:bg-green-600")}>
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
