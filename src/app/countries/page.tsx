'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AddCountryDialog from '@/components/countries/AddCountryDialog';
import EditCountryDialog from '@/components/countries/EditCountryDialog';
import CountryListTable from '@/components/countries/CountryListTable';
import GridSettingsDialog from '@/components/products/GridSettingsDialog';
import ImportSettingsDialog from '@/components/shared/ImportSettingsDialog';
import type { Country, SortConfig, ColumnDefinition, PersistedColumnSetting, GridSetting, GridTemplate } from '@/types';
import { PlusCircle, Map, Loader2, Settings, Upload, Download, Search } from 'lucide-react';
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
import { useDexieCountries } from '@/hooks/useDexieCountries';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const PAGE_PATH = "/countries";

export default function CountryManagerPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { countries, isLoading: isLoadingCountries, addCountry, updateCountry, deleteCountry } = useDexieCountries(); 
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  
  const { toast } = useToast();

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [countryToDelete, setCountryToDelete] = useState<Country | null>(null);

  const [isGridSettingsDialogOpen, setIsGridSettingsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [countriesToImport, setCountriesToImport] = useState<Partial<Country>[] | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sortConfig, setSortConfig] = useState<SortConfig<Country> | null>(null);
  const [groupingKeys, setGroupingKeys] = useState<string[]>([]);
  const [columnDefinitions, setColumnDefinitions] = useState<ColumnDefinition<Country>[]>([]);
  const [persistedColumnSettings, setPersistedColumnSettings] = useState<PersistedColumnSetting[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const getDefaultColumnDefinitions = useCallback((translateFn: typeof t): ColumnDefinition<Country>[] => [
    { key: 'flagImageUrl', label: translateFn('CountryListTable.headerFlag'), isSortable: false, isGroupable: false },
    { key: 'name', label: translateFn('CountryListTable.headerName'), isSortable: true, isGroupable: true },
    { key: 'codeAlpha2', label: translateFn('CountryListTable.headerCodeAlpha2'), isSortable: true, isGroupable: false },
    { key: 'currencyCode', label: translateFn('CountryListTable.headerCurrency'), isSortable: true, isGroupable: true },
    { key: 'isEnabled', label: translateFn('CountryListTable.headerEnabled'), isSortable: true, isGroupable: true },
    { key: 'isDefault', label: translateFn('CountryListTable.headerDefault'), isSortable: true, isGroupable: true },
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

  const handleAddCountry = async (newCountryData: Omit<Country, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addCountry(newCountryData);
      toast({
        title: t('Toasts.countryAddedTitle'),
        description: t('Toasts.countryAddedDescription', {countryName: newCountryData.name}),
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('CountryManagerPage.errorAddingCountry'),
      });
    }
  };

  const handleEditCountryTrigger = (country: Country) => {
    setEditingCountry(country);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedCountry = async (updatedCountryData: Country) => {
    try {
      await updateCountry(updatedCountryData);
      toast({
        title: t('Toasts.countryUpdatedTitle'),
        description: t('Toasts.countryUpdatedDescription', {countryName: updatedCountryData.name}),
      });
      setIsEditDialogOpen(false);
      setEditingCountry(null);
    } catch (error) {
       toast({ 
         variant: 'destructive',
         title: t('Common.error'), 
         description: error instanceof Error ? error.message : t('CountryManagerPage.errorUpdatingCountry')
        });
    }
  };
  
  const handleToggleEnable = async (country: Country, isEnabled: boolean) => {
    try {
      await updateCountry({ ...country, isEnabled });
      toast({
        title: t('Toasts.countryStatusUpdatedTitle'),
        description: t('Toasts.countryStatusUpdatedDescription', {countryName: country.name, status: isEnabled ? t('Common.enabled') : t('Common.disabled') }),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('CountryManagerPage.errorUpdatingStatus') });
    }
  };
  
  const handleSetDefault = async (countryId: string) => {
    const countryToUpdate = countries.find(c => c.id === countryId);
    if (!countryToUpdate) return;
     try {
      await updateCountry({ ...countryToUpdate, isDefault: true });
      toast({
        title: t('Toasts.countryDefaultSetTitle'),
        description: t('Toasts.countryDefaultSetDescription', {countryName: countryToUpdate.name}),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('CountryManagerPage.errorSettingDefault')});
    }
  };

  const handleDeleteCountryTrigger = (country: Country) => {
    setCountryToDelete(country);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDeleteCountry = async () => {
    if (!countryToDelete) return;
    try {
      await deleteCountry(countryToDelete.id);
      toast({
        title: t('Toasts.countryDeletedTitle'),
        description: t('Toasts.countryDeletedDescription', {countryName: countryToDelete.name}),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('CountryManagerPage.errorDeletingCountry'),
      });
    } finally {
      setShowDeleteConfirmDialog(false);
      setCountryToDelete(null);
    }
  };

  const handleExport = () => {
    if (countries.length === 0) {
      toast({ title: t('Toasts.noProductsToExportTitle'), variant: 'default'});
      return;
    }
    const jsonString = JSON.stringify(countries, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "countries_export.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: t('Toasts.exportSuccessTitle'), description: t('Toasts.exportSuccessDescriptionCountries', { count: countries.length }) });
  };
  
  const handleImportButtonClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const text = await file.text();
    let parsedCountries: Partial<Country>[] = [];

    if (file.name.endsWith('.json')) {
      parsedCountries = JSON.parse(text);
    } else {
      toast({ variant: 'destructive', title: t('Common.error'), description: t('ProductManagementPage.invalidFileTypeError') });
      return;
    }

    setCountriesToImport(parsedCountries);
    setIsImportDialogOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleConfirmImport = async (settings: { conflictResolution: 'skip' | 'overwrite' }) => {
    if (!countriesToImport) return;
    setIsImporting(true);
    setIsImportDialogOpen(false);
    try {
      const response = await fetch('/api/countries/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countries: countriesToImport, settings }),
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
      setCountriesToImport(null);
      setImportFileName(null);
    }
  };

  const handleSortRequest = useCallback((key: keyof Country | string, direction: 'asc' | 'desc' | null) => {
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
    newSortConfig: SortConfig<Country> | null,
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
  
  const filteredCountries = useMemo(() => {
    if (!searchTerm) return countries;
    const lowercasedTerm = searchTerm.toLowerCase();
    return countries.filter(c => 
      c.name.toLowerCase().includes(lowercasedTerm) ||
      c.codeAlpha2.toLowerCase().includes(lowercasedTerm) ||
      (c.codeAlpha3 && c.codeAlpha3.toLowerCase().includes(lowercasedTerm)) ||
      (c.currencyCode && c.currencyCode.toLowerCase().includes(lowercasedTerm))
    );
  }, [countries, searchTerm]);

  const sortedCountries = useMemo(() => {
    let sortableItems = [...filteredCountries];
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
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else {
          comparison = String(valA).localeCompare(String(valB));
        }
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [filteredCountries, sortConfig]);

  if (!hasPermission('manage_countries_page')) {
    return <AccessDeniedMessage />;
  }

  if (isLoadingTranslations || (isLoadingCountries && countries.length === 0)) {
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
          <Map className="mr-3 h-8 w-8" /> {t('CountryManagerPage.title')}
        </h1>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={() => setIsGridSettingsDialogOpen(true)} variant="outline" size="icon" aria-label={t('ProductManagementPage.gridSettingsButton')} disabled={!hasPermission('manage_countries_page')}>
                      <Settings className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('ProductManagementPage.gridSettingsButton')}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={handleImportButtonClick} variant="outline" size="icon" aria-label={t('ProductManagementPage.importProductsButton')} disabled={isImporting || !hasPermission('manage_countries_page')}>
                      {isImporting ? <Loader2 className="h-5 w-5 animate-spin"/> : <Upload className="h-5 w-5" />}
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('ProductManagementPage.importProductsButton')}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={handleExport} variant="outline" size="icon" aria-label={t('ProductManagementPage.exportProductsButton')} disabled={!hasPermission('manage_countries_page')}>
                      <Download className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('ProductManagementPage.exportProductsButton')}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90" size="icon" disabled={!hasPermission('manage_countries_page')} aria-label={t('CountryManagerPage.addNewCountryButton')}>
                      <PlusCircle className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('CountryManagerPage.addNewCountryButton')}</p></TooltipContent>
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
              placeholder={t('CountryManagerPage.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full max-w-sm"
            />
          </div>
          {isLoadingCountries && countries.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <CountryListTable
              countries={sortedCountries}
              onEditCountry={handleEditCountryTrigger}
              onDeleteCountry={handleDeleteCountryTrigger}
              onToggleEnable={handleToggleEnable}
              onSetDefault={handleSetDefault}
              onSort={handleSortRequest}
              currentSortKey={sortConfig?.key}
              currentSortDirection={sortConfig?.direction}
            />
          )}
        </CardContent>
      </Card>
      
      <GridSettingsDialog<Country>
        open={isGridSettingsDialogOpen}
        onOpenChange={setIsGridSettingsDialogOpen}
        pagePath={PAGE_PATH}
        allColumnDefinitions={columnDefinitions}
        currentPersistedSettings={persistedColumnSettings}
        currentSortConfig={sortConfig}
        currentGroupingKeys={groupingKeys}
        onSave={handleSaveGridConfiguration}
      />

      {countriesToImport && (
        <ImportSettingsDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          fileName={importFileName || ''}
          itemCount={countriesToImport.length}
          onConfirmImport={handleConfirmImport}
          isImporting={isImporting}
        />
      )}

      <AddCountryDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddCountry={handleAddCountry}
        existingCodes={countries.map(c => c.codeAlpha2)}
      />

      {editingCountry && (
        <EditCountryDialog
          open={isEditDialogOpen}
          onOpenChange={(isOpen) => {
            setIsEditDialogOpen(isOpen);
            if (!isOpen) setEditingCountry(null);
          }}
          country={editingCountry}
          onSaveCountry={handleSaveEditedCountry}
          existingCodes={countries.filter(c => c.id !== editingCountry.id).map(c => c.codeAlpha2)}
        />
      )}

      {countryToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={(isOpen) => {
          setShowDeleteConfirmDialog(isOpen);
          if (!isOpen) setCountryToDelete(null);
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('CountryManagerPage.deleteDialogTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('CountryManagerPage.deleteDialogDescription', {countryName: countryToDelete?.name || 'this country'})}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('CountryManagerPage.deleteDialogCancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteCountry} 
                className={buttonVariants({ variant: "destructive" })}
              >
                {t('CountryManagerPage.deleteDialogConfirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
