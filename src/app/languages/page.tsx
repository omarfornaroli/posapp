
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Languages, Loader2, SaveAll, AlertTriangle, Settings, Upload, Download, PlusCircle, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AppLanguage, SortConfig, ColumnDefinition, PersistedColumnSetting, GridSetting, GridTemplate } from '@/types';
import AddAppLanguageDialog from '@/components/languages/AddAppLanguageDialog';
import EditAppLanguageDialog from '@/components/languages/EditAppLanguageDialog';
import AppLanguageListTable from '@/components/languages/AppLanguageListTable';
import GridSettingsDialog from '@/components/products/GridSettingsDialog';
import ImportSettingsDialog from '@/components/shared/ImportSettingsDialog';
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
import { useDexieAppLanguages } from '@/hooks/useDexieAppLanguages'; 
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const PAGE_PATH = "/languages";

export default function LanguagesManagerPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { toast } = useToast();

  const { appLanguages, isLoading: isLoadingLanguages, addLanguage, updateLanguage, deleteLanguage } = useDexieAppLanguages(); 
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<AppLanguage | null>(null);
  const [languageToDelete, setLanguageToDelete] = useState<AppLanguage | null>(null);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  
  const [isApplyingConfig, setIsApplyingConfig] = useState(false);

  const [isGridSettingsDialogOpen, setIsGridSettingsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [languagesToImport, setLanguagesToImport] = useState<Partial<AppLanguage>[] | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sortConfig, setSortConfig] = useState<SortConfig<AppLanguage> | null>(null);
  const [groupingKeys, setGroupingKeys] = useState<string[]>([]);
  const [columnDefinitions, setColumnDefinitions] = useState<ColumnDefinition<AppLanguage>[]>([]);
  const [persistedColumnSettings, setPersistedColumnSettings] = useState<PersistedColumnSetting[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const getAuthHeaders = () => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (typeof window !== 'undefined') {
      const userEmail = localStorage.getItem('loggedInUserEmail');
      if (userEmail) headers['X-User-Email'] = userEmail;
    }
    return headers;
  };

  const getDefaultColumnDefinitions = useCallback((translateFn: typeof t): ColumnDefinition<AppLanguage>[] => [
    { key: 'name', label: translateFn('AppLanguageListTable.headerName'), isSortable: true, isGroupable: false },
    { key: 'code', label: translateFn('AppLanguageListTable.headerCode'), isSortable: true, isGroupable: false },
    { key: 'isEnabled', label: translateFn('AppLanguageListTable.headerEnabled'), isSortable: true, isGroupable: true },
    { key: 'isDefault', label: translateFn('AppLanguageListTable.headerDefault'), isSortable: true, isGroupable: true },
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

  const handleAddAppLanguage = async (newLangData: Omit<AppLanguage, 'id'>) => {
    try {
      await addLanguage(newLangData);
      toast({ title: t('Toasts.languageAddedTitle') || 'Language Added', description: t('Toasts.languageAddedDescription', { langName: newLangData.name }) });
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error') || 'Error', description: error instanceof Error ? error.message : (t('errorAddingLanguageApi') || 'API error adding language') });
    }
  };

  const handleEditAppLanguageTrigger = (language: AppLanguage) => {
    setEditingLanguage(language);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedAppLanguage = async (updatedLangData: AppLanguage) => {
     try {
      await updateLanguage(updatedLangData);
      toast({ title: t('Toasts.languageUpdatedTitle') || 'Language Updated', description: t('Toasts.languageUpdatedDescription', { langName: updatedLangData.name }) });
      setIsEditDialogOpen(false);
      setEditingLanguage(null);
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error') || 'Error', description: error instanceof Error ? error.message : (t('errorUpdatingLanguageApi') || 'API error updating language') });
    }
  };

  const handleDeleteAppLanguageTrigger = (language: AppLanguage) => {
    setLanguageToDelete(language);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDeleteAppLanguage = async () => {
    if (!languageToDelete) return;
    try {
      await deleteLanguage(languageToDelete.id);
      toast({ title: t('Toasts.languageDeletedTitle') || 'Language Deleted', description: t('Toasts.languageDeletedDescription', { langName: languageToDelete.name }) });
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error') || 'Error', description: error instanceof Error ? error.message : (t('errorDeletingLanguageApi') || 'API error deleting language') });
    } finally {
      setShowDeleteConfirmDialog(false);
      setLanguageToDelete(null);
    }
  };
  
  const handleToggleEnable = async (language: AppLanguage, isEnabled: boolean) => {
    try {
      await updateLanguage({ ...language, isEnabled });
      toast({
        title: t('Toasts.languageStatusUpdatedTitle') || 'Status Updated',
        description: t('Toasts.languageStatusUpdatedDescription', {langName: language.name, status: isEnabled ? (t('Common.enabled') || 'Enabled') : (t('Common.disabled') || 'Disabled') }),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error') || 'Error', description: error instanceof Error ? error.message : (t('errorUpdatingLanguageStatusApi') || 'API error updating status') });
    }
  };
  
  const handleSetDefault = async (languageId: string) => {
    const langToUpdate = appLanguages.find(l => l.id === languageId);
    if (!langToUpdate) return;
     try {
      await updateLanguage({ ...langToUpdate, isDefault: true });
      toast({
        title: t('Toasts.languageDefaultSetTitle') || 'Default Set',
        description: t('Toasts.languageDefaultSetDescription', {langName: langToUpdate.name}),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error') || 'Error', description: error instanceof Error ? error.message : (t('errorSettingDefaultLanguageApi') || 'API error setting default')});
    }
  };

  const handleApplyConfiguration = async () => {
    setIsApplyingConfig(true);
    try {
      const response = await fetch('/api/languages/apply-configuration', { method: 'POST', headers: getAuthHeaders() });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || t('errorApplyingConfig') || 'Failed to apply config');
      toast({ title: t('Toasts.configAppliedTitle') || 'Config Applied', description: t('Toasts.configAppliedDescription') || 'Config applied, restart server.' });
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error') || 'Error', description: error instanceof Error ? error.message : (t('errorApplyingConfigApi') || 'API error applying config') });
    } finally {
      setIsApplyingConfig(false);
    }
  };

  const handleExport = () => {
    if (appLanguages.length === 0) {
      toast({ title: t('Toasts.noProductsToExportTitle'), variant: 'default'});
      return;
    }
    const jsonString = JSON.stringify(appLanguages, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "languages_export.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: t('Toasts.exportSuccessTitle'), description: t('Toasts.exportSuccessDescriptionLanguages', { count: appLanguages.length }) });
  };
  
  const handleImportButtonClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const text = await file.text();
    let parsedLanguages: Partial<AppLanguage>[] = [];

    if (file.name.endsWith('.json')) {
      parsedLanguages = JSON.parse(text);
    } else {
      toast({ variant: 'destructive', title: t('Common.error'), description: t('ProductManagementPage.invalidFileTypeError') });
      return;
    }

    setLanguagesToImport(parsedLanguages);
    setIsImportDialogOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleConfirmImport = async (settings: { conflictResolution: 'skip' | 'overwrite' }) => {
    if (!languagesToImport) return;
    setIsImporting(true);
    setIsImportDialogOpen(false);
    try {
      const response = await fetch('/api/languages/import', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ languages: languagesToImport, settings }),
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
      setLanguagesToImport(null);
      setImportFileName(null);
    }
  };

  const handleSortRequest = useCallback((key: keyof AppLanguage | string, direction: 'asc' | 'desc' | null) => {
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
    newSortConfig: SortConfig<AppLanguage> | null,
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
  
  const filteredLanguages = useMemo(() => {
    if (!searchTerm) return appLanguages;
    const lowercasedTerm = searchTerm.toLowerCase();
    return appLanguages.filter(lang => 
      lang.name.toLowerCase().includes(lowercasedTerm) ||
      lang.code.toLowerCase().includes(lowercasedTerm)
    );
  }, [appLanguages, searchTerm]);

  const sortedLanguages = useMemo(() => {
    let sortableItems = [...filteredLanguages];
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
  }, [filteredLanguages, sortConfig]);

  if (!hasPermission('manage_languages_page')) {
    return <AccessDeniedMessage />;
  }

  if (isLoadingTranslations || (isLoadingLanguages && appLanguages.length === 0)) {
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
          <Languages className="mr-3 h-8 w-8" /> {t('LanguagesManagerPage.title')}
        </h1>
        <div className="flex flex-wrap gap-2 justify-end">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                    <Button onClick={() => setIsGridSettingsDialogOpen(true)} variant="outline" size="icon" aria-label={t('ProductManagementPage.gridSettingsButton')} disabled={!hasPermission('manage_languages_page')}>
                        <Settings className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>{t('ProductManagementPage.gridSettingsButton')}</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                    <Button onClick={handleImportButtonClick} variant="outline" size="icon" aria-label={t('ProductManagementPage.importProductsButton')} disabled={isImporting || !hasPermission('manage_languages_page')}>
                        {isImporting ? <Loader2 className="h-5 w-5 animate-spin"/> : <Upload className="h-5 w-5" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>{t('ProductManagementPage.importProductsButton')}</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                    <Button onClick={handleExport} variant="outline" size="icon" aria-label={t('ProductManagementPage.exportProductsButton')} disabled={!hasPermission('manage_languages_page')}>
                        <Download className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>{t('ProductManagementPage.exportProductsButton')}</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                    <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90" size="icon" disabled={!hasPermission('manage_languages_page')} aria-label={t('LanguagesManagerPage.addNewLanguageButton')}>
                        <PlusCircle className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>{t('LanguagesManagerPage.addNewLanguageButton')}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={handleApplyConfiguration} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isApplyingConfig || !hasPermission('manage_languages_page')}>
                {isApplyingConfig ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <SaveAll className="mr-2 h-5 w-5" />}
                {t('LanguagesManagerPage.applyConfigurationButton')}
            </Button>
        </div>
      </div>
      <CardDescription>{t('LanguagesManagerPage.pageDescriptionTable')}</CardDescription>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline">{t('LanguagesManagerPage.languageListTitle')}</CardTitle>
          <CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('LanguagesManagerPage.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full max-w-sm"
                />
              </div>
            </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLanguages && appLanguages.length === 0 ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
          ) : (
            <AppLanguageListTable
              languages={sortedLanguages}
              onEditLanguage={handleEditAppLanguageTrigger}
              onDeleteLanguage={handleDeleteAppLanguageTrigger}
              onToggleEnable={handleToggleEnable}
              onSetDefault={handleSetDefault}
              onSort={handleSortRequest}
              currentSortKey={sortConfig?.key}
              currentSortDirection={sortConfig?.direction}
            />
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-lg border-l-4 border-amber-500">
        <CardHeader className="flex flex-row items-start gap-3">
          <AlertTriangle className="h-8 w-8 text-amber-500 mt-1 shrink-0" />
          <div>
            <CardTitle className="text-amber-600">{t('LanguagesManagerPage.importantStepsTitle')}</CardTitle>
            <CardDescription className="text-amber-700">{t('LanguagesManagerPage.importantStepsDescriptionTable')}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><strong>{t('LanguagesManagerPage.autoUpdateInfo')}</strong> {t('LanguagesManagerPage.autoUpdateDetailTable')}</p>
          <p><strong>{t('LanguagesManagerPage.manualStepRestartServerAction')}</strong> {t('LanguagesManagerPage.manualStepRestartServerDetail')}</p>
          <p><strong>{t('LanguagesManagerPage.manualStepPopulateFilesAction')}</strong> {t('LanguagesManagerPage.manualStepPopulateFilesDetailTable')}</p>
        </CardContent>
      </Card>
      
      <GridSettingsDialog<AppLanguage>
        open={isGridSettingsDialogOpen}
        onOpenChange={setIsGridSettingsDialogOpen}
        pagePath={PAGE_PATH}
        allColumnDefinitions={columnDefinitions}
        currentPersistedSettings={persistedColumnSettings}
        currentSortConfig={sortConfig}
        currentGroupingKeys={groupingKeys}
        onSave={handleSaveGridConfiguration}
      />
      
      {languagesToImport && (
        <ImportSettingsDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          fileName={importFileName || ''}
          itemCount={languagesToImport.length}
          onConfirmImport={handleConfirmImport}
          isImporting={isImporting}
        />
      )}

      <AddAppLanguageDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddLanguage={handleAddAppLanguage}
        existingCodes={appLanguages.map(l => l.code)}
      />

      {editingLanguage && (
        <EditAppLanguageDialog
          open={isEditDialogOpen}
          onOpenChange={(isOpen) => {
            setIsEditDialogOpen(isOpen);
            if (!isOpen) setEditingLanguage(null);
          }}
          language={editingLanguage}
          onSaveLanguage={handleSaveEditedAppLanguage}
        />
      )}

      {languageToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={(isOpen) => {
          setShowDeleteConfirmDialog(isOpen);
          if (!isOpen) setLanguageToDelete(null);
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('LanguagesManagerPage.deleteDialogTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('LanguagesManagerPage.deleteDialogDescription', {langName: languageToDelete?.name || 'this language'})}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('LanguagesManagerPage.deleteDialogCancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteAppLanguage} 
                className={buttonVariants({ variant: "destructive" })}
              >
                {t('LanguagesManagerPage.deleteDialogConfirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
