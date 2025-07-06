'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlusCircle, CreditCard, Loader2, Settings, Upload, Download, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PaymentMethod, SortConfig, ColumnDefinition, PersistedColumnSetting, GridSetting, GridTemplate } from '@/types';
import AddPaymentMethodDialog from '@/components/payment-methods/AddPaymentMethodDialog';
import EditPaymentMethodDialog from '@/components/payment-methods/EditPaymentMethodDialog';
import PaymentMethodListTable from '@/components/payment-methods/PaymentMethodListTable';
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
import { useDexiePaymentMethods } from '@/hooks/useDexiePaymentMethods';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const PAGE_PATH = "/payment-methods";

export default function PaymentMethodsManagerPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const { paymentMethods, isLoading: isLoadingPaymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod } = useDexiePaymentMethods();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  
  const { toast } = useToast();

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<PaymentMethod | null>(null);

  const [isGridSettingsDialogOpen, setIsGridSettingsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [methodsToImport, setMethodsToImport] = useState<Partial<PaymentMethod>[] | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sortConfig, setSortConfig] = useState<SortConfig<PaymentMethod> | null>(null);
  const [groupingKeys, setGroupingKeys] = useState<string[]>([]);
  const [columnDefinitions, setColumnDefinitions] = useState<ColumnDefinition<PaymentMethod>[]>([]);
  const [persistedColumnSettings, setPersistedColumnSettings] = useState<PersistedColumnSetting[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const getDefaultColumnDefinitions = useCallback((translateFn: typeof t): ColumnDefinition<PaymentMethod>[] => [
    { key: 'name', label: translateFn('PaymentMethodListTable.headerName'), isSortable: true, isGroupable: true },
    { key: 'description', label: translateFn('PaymentMethodListTable.headerDescription'), isSortable: false, isGroupable: false },
    { key: 'isEnabled', label: translateFn('PaymentMethodListTable.headerEnabled'), isSortable: true, isGroupable: true, className: 'text-center' },
    { key: 'isDefault', label: translateFn('PaymentMethodListTable.headerDefault'), isSortable: true, isGroupable: true, className: 'text-center' },
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

  const handleAddPaymentMethod = async (newMethodData: Omit<PaymentMethod, 'id'| 'createdAt' | 'updatedAt'>) => {
     try {
      await addPaymentMethod(newMethodData);
      toast({
        title: t('Toasts.paymentMethodAddedTitle'),
        description: t('Toasts.paymentMethodAddedDescription', { methodName: newMethodData.name }),
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('PaymentMethodsManagerPage.errorAddingMethod'),
      });
    }
  };

  const handleEditPaymentMethodTrigger = (methodId: string) => {
    const methodToEdit = paymentMethods.find(m => m.id === methodId);
    if (methodToEdit) {
      setEditingMethod(methodToEdit);
      setIsEditDialogOpen(true);
    } else {
      toast({ title: t('Common.error'), description: t('PaymentMethodsManagerPage.errorNotFoundForEditing'), variant: 'destructive' });
    }
  };

  const handleSaveEditedPaymentMethod = async (updatedMethodData: PaymentMethod) => {
    try {
      await updatePaymentMethod(updatedMethodData);
      toast({
        title: t('Toasts.paymentMethodUpdatedTitle'),
        description: t('Toasts.paymentMethodUpdatedDescription', {methodName: updatedMethodData.name}),
      });
      setIsEditDialogOpen(false);
      setEditingMethod(null);
    } catch (error) {
       toast({ 
         variant: 'destructive',
         title: t('Common.error'), 
         description: error instanceof Error ? error.message : t('PaymentMethodsManagerPage.errorUpdatingMethod')
        });
    }
  };
  
  const handleToggleEnable = async (method: PaymentMethod, isEnabled: boolean) => {
    try {
      await updatePaymentMethod({ ...method, isEnabled });
      toast({
        title: t('Toasts.paymentMethodStatusUpdatedTitle'),
        description: t('Toasts.paymentMethodStatusUpdatedDescription', {methodName: method.name, status: isEnabled ? t('Common.enabled') : t('Common.disabled') }),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('PaymentMethodsManagerPage.errorUpdatingMethodStatus') });
    }
  };
  
  const handleSetDefault = async (methodId: string) => {
     const methodToUpdate = paymentMethods.find(m => m.id === methodId);
     if (!methodToUpdate) return;
     try {
      await updatePaymentMethod({ ...methodToUpdate, isDefault: true });
      toast({
        title: t('Toasts.paymentMethodDefaultSetTitle'),
        description: t('Toasts.paymentMethodDefaultSetDescription', {methodName: methodToUpdate.name}),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('PaymentMethodsManagerPage.errorSettingDefaultMethod')});
    }
  };


  const handleDeletePaymentMethodTrigger = (methodId: string) => {
    const method = paymentMethods.find(m => m.id === methodId);
    if (method) {
      setMethodToDelete(method);
      setShowDeleteConfirmDialog(true);
    } else {
       toast({ title: t('Common.error'), description: t('PaymentMethodsManagerPage.errorNotFoundForDeletion'), variant: 'destructive' });
    }
  };

  const confirmDeletePaymentMethod = async () => {
    if (!methodToDelete) return;
    try {
      await deletePaymentMethod(methodToDelete.id);
      toast({
        title: t('Toasts.paymentMethodDeletedTitle'),
        description: t('Toasts.paymentMethodDeletedDescription', {methodName: methodToDelete.name}),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('PaymentMethodsManagerPage.errorDeletingMethod'),
      });
    } finally {
      setShowDeleteConfirmDialog(false);
      setMethodToDelete(null);
    }
  };
  
  const handleExport = () => {
    if (paymentMethods.length === 0) {
      toast({ title: t('Toasts.noProductsToExportTitle'), variant: 'default'});
      return;
    }
    const jsonString = JSON.stringify(paymentMethods, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "payment-methods_export.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: t('Toasts.exportSuccessTitle'), description: t('Toasts.exportSuccessDescriptionPaymentMethods', { count: paymentMethods.length }) });
  };
  
  const handleImportButtonClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const text = await file.text();
    let parsedMethods: Partial<PaymentMethod>[] = [];

    if (file.name.endsWith('.json')) {
      parsedMethods = JSON.parse(text);
    } else {
      toast({ variant: 'destructive', title: t('Common.error'), description: t('ProductManagementPage.invalidFileTypeError') });
      return;
    }

    setMethodsToImport(parsedMethods);
    setIsImportDialogOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleConfirmImport = async (settings: { conflictResolution: 'skip' | 'overwrite' }) => {
    if (!methodsToImport) return;
    setIsImporting(true);
    setIsImportDialogOpen(false);
    try {
      const response = await fetch('/api/payment-methods/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethods: methodsToImport, settings }),
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
      setMethodsToImport(null);
      setImportFileName(null);
    }
  };

  const handleSortRequest = useCallback((key: keyof PaymentMethod | string, direction: 'asc' | 'desc' | null) => {
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
    newSortConfig: SortConfig<PaymentMethod> | null,
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

  const filteredPaymentMethods = useMemo(() => {
    if (!searchTerm) return paymentMethods;
    const lowercasedTerm = searchTerm.toLowerCase();
    return paymentMethods.filter(method => 
      method.name.toLowerCase().includes(lowercasedTerm) ||
      (method.description && method.description.toLowerCase().includes(lowercasedTerm))
    );
  }, [paymentMethods, searchTerm]);

  const sortedPaymentMethods = useMemo(() => {
    let sortableItems = [...filteredPaymentMethods];
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
  }, [filteredPaymentMethods, sortConfig]);

  if (isLoadingTranslations || (isLoadingPaymentMethods && paymentMethods.length === 0)) {
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
          <CreditCard className="mr-3 h-8 w-8" /> {t('PaymentMethodsManagerPage.title')}
        </h1>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={() => setIsGridSettingsDialogOpen(true)} variant="outline" size="icon" aria-label={t('ProductManagementPage.gridSettingsButton')}>
                      <Settings className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('ProductManagementPage.gridSettingsButton')}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={handleImportButtonClick} variant="outline" size="icon" aria-label={t('ProductManagementPage.importProductsButton')} disabled={isImporting}>
                      {isImporting ? <Loader2 className="h-5 w-5 animate-spin"/> : <Upload className="h-5 w-5" />}
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('ProductManagementPage.importProductsButton')}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={handleExport} variant="outline" size="icon" aria-label={t('ProductManagementPage.exportProductsButton')}>
                      <Download className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('ProductManagementPage.exportProductsButton')}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90" size="icon" aria-label={t('PaymentMethodsManagerPage.addNewMethodButton')}>
                      <PlusCircle className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('PaymentMethodsManagerPage.addNewMethodButton')}</p></TooltipContent>
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
              placeholder={t('PaymentMethodsManagerPage.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full max-w-sm"
            />
          </div>
          {isLoadingPaymentMethods && paymentMethods.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <PaymentMethodListTable
              paymentMethods={sortedPaymentMethods}
              onEditPaymentMethod={handleEditPaymentMethodTrigger}
              onDeletePaymentMethod={handleDeletePaymentMethodTrigger}
              onToggleEnable={handleToggleEnable}
              onSetDefault={handleSetDefault}
              onSort={handleSortRequest}
              currentSortKey={sortConfig?.key}
              currentSortDirection={sortConfig?.direction}
            />
          )}
        </CardContent>
      </Card>
      
      <GridSettingsDialog<PaymentMethod>
        open={isGridSettingsDialogOpen}
        onOpenChange={setIsGridSettingsDialogOpen}
        pagePath={PAGE_PATH}
        allColumnDefinitions={columnDefinitions}
        currentPersistedSettings={persistedColumnSettings}
        currentSortConfig={sortConfig}
        currentGroupingKeys={groupingKeys}
        onSave={handleSaveGridConfiguration}
      />
      
      {methodsToImport && (
        <ImportSettingsDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          fileName={importFileName || ''}
          itemCount={methodsToImport.length}
          onConfirmImport={handleConfirmImport}
          isImporting={isImporting}
        />
      )}

      <AddPaymentMethodDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddPaymentMethod={handleAddPaymentMethod}
      />

      {editingMethod && (
        <EditPaymentMethodDialog
          open={isEditDialogOpen}
          onOpenChange={(isOpen) => {
            setIsEditDialogOpen(isOpen);
            if (!isOpen) setEditingMethod(null);
          }}
          paymentMethod={editingMethod}
          onSavePaymentMethod={handleSaveEditedPaymentMethod}
        />
      )}

      {methodToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={(isOpen) => {
          setShowDeleteConfirmDialog(isOpen);
          if (!isOpen) setMethodToDelete(null);
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('PaymentMethodsManagerPage.deleteDialogTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('PaymentMethodsManagerPage.deleteDialogDescription', {methodName: methodToDelete?.name || 'this method'})}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('PaymentMethodsManagerPage.deleteDialogCancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeletePaymentMethod} 
                className={buttonVariants({ variant: "destructive" })}
              >
                {t('PaymentMethodsManagerPage.deleteDialogConfirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
