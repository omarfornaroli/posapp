'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AddCurrencyDialog from '@/components/currencies/AddCurrencyDialog';
import EditCurrencyDialog from '@/components/currencies/EditCurrencyDialog';
import CurrencyListTable from '@/components/currencies/CurrencyListTable';
import GridSettingsDialog from '@/components/products/GridSettingsDialog';
import ImportSettingsDialog from '@/components/shared/ImportSettingsDialog';
import type { Currency, SortConfig, ColumnDefinition, PersistedColumnSetting, GridSetting, GridTemplate } from '@/types';
import { PlusCircle, Landmark, Loader2, Settings, Upload, Download, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from '@/components/ui/button';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useDexieCurrencies } from '@/hooks/useDexieCurrencies';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const PAGE_PATH = "/currencies";

export default function CurrencyManagerPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { currencies, isLoading: isLoadingCurrencies, addCurrency, updateCurrency, deleteCurrency } = useDexieCurrencies();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  
  const { toast } = useToast();

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [currencyToDelete, setCurrencyToDelete] = useState<Currency | null>(null);

  const [isGridSettingsDialogOpen, setIsGridSettingsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [currenciesToImport, setCurrenciesToImport] = useState<Partial<Currency>[] | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sortConfig, setSortConfig] = useState<SortConfig<Currency> | null>(null);
  const [groupingKeys, setGroupingKeys] = useState<string[]>([]);
  const [columnDefinitions, setColumnDefinitions] = useState<ColumnDefinition<Currency>[]>([]);
  const [persistedColumnSettings, setPersistedColumnSettings] = useState<PersistedColumnSetting[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const getDefaultColumnDefinitions = useCallback((translateFn: typeof t): ColumnDefinition<Currency>[] => [
    { key: 'name', label: translateFn('CurrencyManager.headerName'), isSortable: true, isGroupable: true },
    { key: 'code', label: translateFn('CurrencyManager.headerCode'), isSortable: true, isGroupable: false },
    { key: 'symbol', label: translateFn('CurrencyManager.headerSymbol'), isSortable: false, isGroupable: false, className: 'text-center' },
    { key: 'decimalPlaces', label: translateFn('CurrencyManager.headerDecimalPlaces'), isSortable: true, isGroupable: false, className: 'text-center' },
    { key: 'isEnabled', label: translateFn('CurrencyManager.headerEnabled'), isSortable: true, isGroupable: true, className: 'text-center' },
    { key: 'isDefault', label: translateFn('CurrencyManager.headerDefault'), isSortable: true, isGroupable: true, className: 'text-center' },
  ], []);
  
  useEffect(() => {
    if (!isLoadingTranslations) {
      setColumnDefinitions(getDefaultColumnDefinitions(t));
    }
  }, [isLoadingTranslations, t, getDefaultColumnDefinitions]);

  const persistGridSettingsToApi = useCallback(async (settingsToPersist: GridSetting) => {
    try {
      await fetch('/api/grid-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToPersist),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: 'Failed to save grid preferences.' });
    }
  }, [toast, t]);

  useEffect(() => {
    const fetchGridSettings = async () => {
      try {
        const response = await fetch(`/api/grid-settings?pagePath=${PAGE_PATH}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const savedSettings = result.data as GridSetting;
            setPersistedColumnSettings(savedSettings.columns);
            setSortConfig(savedSettings.sortConfig || null);
            setGroupingKeys(Array.isArray(savedSettings.groupingKeys) ? savedSettings.groupingKeys : []);
          }
        }
      } catch (error) {
        console.error('Error fetching grid settings:', error);
      }
    };
    if (!isLoadingTranslations) {
      fetchGridSettings();
    }
  }, [isLoadingTranslations]);


  const handleAddCurrency = async (newCurrencyData: Omit<Currency, 'id'| 'createdAt' | 'updatedAt'>) => {
    try {
      await addCurrency(newCurrencyData);
      toast({
        title: t('Toasts.currencyAddedTitle'),
        description: t('Toasts.currencyAddedDescription', {currencyName: newCurrencyData.name}),
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('CurrencyManager.errorAddingCurrency'),
      });
    }
  };

  const handleEditCurrencyTrigger = (currency: Currency) => {
    setEditingCurrency(currency);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedCurrency = async (updatedCurrencyData: Currency) => {
    try {
      await updateCurrency(updatedCurrencyData);
      toast({
        title: t('Toasts.currencyUpdatedTitle'),
        description: t('Toasts.currencyUpdatedDescription', {currencyName: updatedCurrencyData.name}),
      });
      setIsEditDialogOpen(false);
      setEditingCurrency(null);
    } catch (error) {
       toast({ 
         variant: 'destructive',
         title: t('Common.error'), 
         description: error instanceof Error ? error.message : t('CurrencyManager.errorUpdatingCurrency')
        });
    }
  };
  
  const handleToggleEnable = async (currency: Currency, isEnabled: boolean) => {
    try {
      await updateCurrency({ ...currency, isEnabled });
      toast({
        title: t('Toasts.currencyStatusUpdatedTitle'),
        description: t('Toasts.currencyStatusUpdatedDescription', {currencyName: currency.name, status: isEnabled ? t('Common.enabled') : t('Common.disabled') }),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('CurrencyManager.errorUpdatingStatus') });
    }
  };
  
  const handleSetDefault = async (currencyId: string) => {
     const currencyToUpdate = currencies.find(c => c.id === currencyId);
     if (!currencyToUpdate) return;
     try {
      await updateCurrency({ ...currencyToUpdate, isDefault: true });
      toast({
        title: t('Toasts.currencyDefaultSetTitle'),
        description: t('Toasts.currencyDefaultSetDescription', {currencyName: currencyToUpdate.name}),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('CurrencyManager.errorSettingDefault')});
    }
  };

  const handleDeleteCurrencyTrigger = (currency: Currency) => {
    setCurrencyToDelete(currency);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDeleteCurrency = async () => {
    if (!currencyToDelete) return;
    try {
      await deleteCurrency(currencyToDelete.id);
      toast({
        title: t('Toasts.currencyDeletedTitle'),
        description: t('Toasts.currencyDeletedDescription', {currencyName: currencyToDelete.name, currencyCode: currencyToDelete.code}),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('CurrencyManager.errorDeletingCurrency'),
      });
    } finally {
      setShowDeleteConfirmDialog(false);
      setCurrencyToDelete(null);
    }
  };
  
  const handleExport = () => {
    if (currencies.length === 0) {
      toast({ title: t('Toasts.noProductsToExportTitle'), variant: 'default'});
      return;
    }
    const jsonString = JSON.stringify(currencies, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "currencies_export.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: t('Toasts.exportSuccessTitle'), description: t('Toasts.exportSuccessDescriptionCurrencies', { count: currencies.length }) });
  };
  
  const handleImportButtonClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const text = await file.text();
    let parsedCurrencies: Partial<Currency>[] = [];

    if (file.name.endsWith('.json')) {
      parsedCurrencies = JSON.parse(text);
    } else {
      toast({ variant: 'destructive', title: t('Common.error'), description: t('ProductManagementPage.invalidFileTypeError') });
      return;
    }

    setCurrenciesToImport(parsedCurrencies);
    setIsImportDialogOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleConfirmImport = async (settings: { conflictResolution: 'skip' | 'overwrite' }) => {
    if (!currenciesToImport) return;
    setIsImporting(true);
    setIsImportDialogOpen(false);
    try {
      const response = await fetch('/api/currencies/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currencies: currenciesToImport, settings }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast({
        title: t('Toasts.importSuccessTitle'),
        description: t('Toasts.importSuccessSummary', result.data),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('Toasts.importFailedError') });
    } finally {
      setIsImporting(false);
      setCurrenciesToImport(null);
      setImportFileName(null);
    }
  };

  const handleSortRequest = useCallback((key: keyof Currency | string, direction: 'asc' | 'desc' | null) => {
    const newSortConfig = direction ? { key, direction } : null;
    setSortConfig(newSortConfig);
    persistGridSettingsToApi({ pagePath: PAGE_PATH, columns: persistedColumnSettings, sortConfig: newSortConfig, groupingKeys });
  }, [persistedColumnSettings, groupingKeys, persistGridSettingsToApi]);

  const handleToggleGroupingKey = useCallback((key: string) => {
    setGroupingKeys(currentKeys => {
        const newKeys = currentKeys.includes(key) ? currentKeys.filter(k => k !== key) : [...currentKeys, key];
        persistGridSettingsToApi({ pagePath: PAGE_PATH, columns: persistedColumnSettings, sortConfig, groupingKeys: newKeys });
        return newKeys;
    });
  }, [persistedColumnSettings, sortConfig, persistGridSettingsToApi]);
  
  const handleSaveGridConfiguration = (
    newColumns: PersistedColumnSetting[],
    newSortConfig: SortConfig<Currency> | null,
    newGroupingKeys: string[]
  ) => {
    setPersistedColumnSettings(newColumns);
    setSortConfig(newSortConfig);
    setGroupingKeys(newGroupingKeys);
    
    const settingsToSavePayload: GridSetting = {
      pagePath: PAGE_PATH,
      columns: newColumns,
      sortConfig: newSortConfig,
      groupingKeys: newGroupingKeys
    };
    persistGridSettingsToApi(settingsToSavePayload);
    setIsGridSettingsDialogOpen(false);
  };
  
  const filteredCurrencies = useMemo(() => {
    if (!searchTerm) return currencies;
    const lowercasedTerm = searchTerm.toLowerCase();
    return currencies.filter(c => 
      c.name.toLowerCase().includes(lowercasedTerm) ||
      c.code.toLowerCase().includes(lowercasedTerm)
    );
  }, [currencies, searchTerm]);

  const sortedCurrencies = useMemo(() => {
    let sortableItems = [...filteredCurrencies];
    if (sortConfig && sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = (a as any)[sortConfig.key];
        const valB = (b as any)[sortConfig.key];

        if (valA == null && valB != null) return 1;
        if (valA != null && valB == null) return -1;
        if (valA == null && valB == null) return 0;
        
        let comparison = 0;
        if (typeof valA === 'boolean' && typeof valB === 'boolean') {
          comparison = valA === valB ? 0 : valA ? -1 : 1; 
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else {
          comparison = String(valA).localeCompare(String(valB));
        }
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [filteredCurrencies, sortConfig]);

  if (!hasPermission('manage_currencies_page')) {
    return <AccessDeniedMessage />;
  }

  if (isLoadingTranslations || (isLoadingCurrencies && currencies.length === 0)) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,64px)-4rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <Landmark className="mr-3 h-8 w-8" /> {t('CurrencyManager.title')}
        </h1>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={() => setIsGridSettingsDialogOpen(true)} variant="outline" size="icon" aria-label={t('ProductManagementPage.gridSettingsButton')} disabled={!hasPermission('manage_currencies_page')}>
                      <Settings className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('ProductManagementPage.gridSettingsButton')}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={handleImportButtonClick} variant="outline" size="icon" aria-label={t('ProductManagementPage.importProductsButton')} disabled={isImporting || !hasPermission('manage_currencies_page')}>
                      {isImporting ? <Loader2 className="h-5 w-5 animate-spin"/> : <Upload className="h-5 w-5" />}
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('ProductManagementPage.importProductsButton')}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={handleExport} variant="outline" size="icon" aria-label={t('ProductManagementPage.exportProductsButton')} disabled={!hasPermission('manage_currencies_page')}>
                      <Download className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('ProductManagementPage.exportProductsButton')}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90" size="icon" disabled={!hasPermission('manage_currencies_page')} aria-label={t('CurrencyManager.addNewCurrencyButton')}>
                      <PlusCircle className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('CurrencyManager.addNewCurrencyButton')}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardContent className="pt-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('CurrencyManager.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full max-w-sm"
            />
          </div>
          {isLoadingCurrencies && currencies.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <CurrencyListTable
              currencies={sortedCurrencies}
              onEditCurrency={handleEditCurrencyTrigger}
              onDeleteCurrency={handleDeleteCurrencyTrigger}
              onToggleEnable={handleToggleEnable}
              onSetDefault={handleSetDefault}
              onSort={handleSortRequest}
              currentSortKey={sortConfig?.key}
              currentSortDirection={sortConfig?.direction}
            />
          )}
        </CardContent>
      </Card>
      
      <GridSettingsDialog<Currency>
        open={isGridSettingsDialogOpen}
        onOpenChange={setIsGridSettingsDialogOpen}
        pagePath={PAGE_PATH}
        allColumnDefinitions={columnDefinitions}
        currentPersistedSettings={persistedColumnSettings}
        currentSortConfig={sortConfig}
        currentGroupingKeys={groupingKeys}
        onSave={handleSaveGridConfiguration}
      />
      
      {currenciesToImport && (
        <ImportSettingsDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          fileName={importFileName || ''}
          itemCount={currenciesToImport.length}
          onConfirmImport={handleConfirmImport}
          isImporting={isImporting}
        />
      )}

      <AddCurrencyDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddCurrency={handleAddCurrency}
        existingCodes={currencies.map(c => c.code)}
      />

      {editingCurrency && (
        <EditCurrencyDialog
          open={isEditDialogOpen}
          onOpenChange={(isOpen) => {
            setIsEditDialogOpen(isOpen);
            if (!isOpen) setEditingCurrency(null);
          }}
          currency={editingCurrency}
          onSaveCurrency={handleSaveEditedCurrency}
          existingCodes={currencies.filter(c => c.id !== editingCurrency.id).map(c => c.code)}
        />
      )}

      {currencyToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={(isOpen) => {
          setShowDeleteConfirmDialog(isOpen);
          if (!isOpen) setCurrencyToDelete(null);
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('CurrencyManager.deleteDialogTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('CurrencyManager.deleteDialogDescription', {currencyName: currencyToDelete?.name || 'this currency', currencyCode: currencyToDelete?.code || ''})}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('CurrencyManager.deleteDialogCancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteCurrency} 
                className={buttonVariants({ variant: "destructive" })}
              >
                {t('CurrencyManager.deleteDialogConfirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
