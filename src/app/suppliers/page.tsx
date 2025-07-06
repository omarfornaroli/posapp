
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AddSupplierDialog from '@/components/suppliers/AddSupplierDialog';
import EditSupplierDialog from '@/components/suppliers/EditSupplierDialog';
import SupplierListTable from '@/components/suppliers/SupplierListTable';
import GridSettingsDialog from '@/components/products/GridSettingsDialog';
import ImportSettingsDialog from '@/components/shared/ImportSettingsDialog';
import type { Supplier, SortConfig, ColumnDefinition, PersistedColumnSetting, GridSetting, GroupedTableItem, GridTemplate } from '@/types';
import { PlusCircle, Building2, Loader2, Settings, Upload, Download, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { buttonVariants } from '@/components/ui/button';
import { useDexieSuppliers } from '@/hooks/useDexieSuppliers';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const PAGE_PATH = "/suppliers";

export default function SuppliersPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { suppliers, isLoading: isLoadingSuppliers, addSupplier, updateSupplier, deleteSupplier } = useDexieSuppliers(); 
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  
  const [isGridSettingsDialogOpen, setIsGridSettingsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [suppliersToImport, setSuppliersToImport] = useState<Partial<Supplier>[] | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sortConfig, setSortConfig] = useState<SortConfig<Supplier> | null>(null);
  const [groupingKeys, setGroupingKeys] = useState<string[]>([]);
  const [columnDefinitions, setColumnDefinitions] = useState<ColumnDefinition<Supplier>[]>([]);
  const [persistedColumnSettings, setPersistedColumnSettings] = useState<PersistedColumnSetting[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const getDefaultColumnDefinitions = useCallback((translateFn: typeof t): ColumnDefinition<Supplier>[] => [
    { key: 'name', label: translateFn('SupplierListTable.headerName'), isSortable: true, isGroupable: true },
    { key: 'contactPerson', label: translateFn('SupplierListTable.headerContactPerson'), isSortable: true, isGroupable: false },
    { key: 'email', label: translateFn('SupplierListTable.headerEmail'), isSortable: true, isGroupable: false },
    { key: 'phone', label: translateFn('SupplierListTable.headerPhone'), isSortable: false, isGroupable: false },
    { key: 'isEnabled', label: translateFn('SupplierListTable.headerEnabled'), isSortable: true, isGroupable: true, className: "text-center" },
  ], []);

  useEffect(() => {
    if (!isLoadingTranslations) {
      const defaultCols = getDefaultColumnDefinitions(t);
      setColumnDefinitions(defaultCols);
      if (persistedColumnSettings.length === 0) {
        setPersistedColumnSettings(defaultCols.map(def => ({ key: String(def.key), visible: def.visible !== false })));
      }
    }
  }, [isLoadingTranslations, t, getDefaultColumnDefinitions, persistedColumnSettings.length]);

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

  const handleAddSupplier = async (newSupplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addSupplier(newSupplierData);
      toast({ title: t('Toasts.supplierAddedTitle'), description: t('Toasts.supplierAddedDescription', {supplierName: newSupplierData.name}) });
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : 'Failed to add supplier locally.' });
    }
  };

  const handleEditSupplierTrigger = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedSupplier = async (updatedSupplierData: Supplier) => {
    try {
      await updateSupplier(updatedSupplierData);
      toast({ title: t('Toasts.supplierUpdatedTitle'), description: t('Toasts.supplierUpdatedDescription', {supplierName: updatedSupplierData.name}) });
      setIsEditDialogOpen(false);
      setEditingSupplier(null);
    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : 'Failed to update supplier locally.' });
    }
  };

  const handleDeleteSupplierTrigger = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    try {
      await deleteSupplier(supplierToDelete.id);
      toast({ title: t('Toasts.supplierDeletedTitle'), description: t('Toasts.supplierDeletedDescription', {supplierName: supplierToDelete.name}) });
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : 'Failed to delete supplier locally.' });
    } finally {
      setShowDeleteConfirmDialog(false);
      setSupplierToDelete(null);
    }
  };
  
  const handleExport = () => {
    if (suppliers.length === 0) {
      toast({ title: t('Toasts.noProductsToExportTitle'), variant: 'default'});
      return;
    }
    const jsonString = JSON.stringify(suppliers, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "suppliers_export.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: t('Toasts.exportSuccessTitle'), description: t('Toasts.exportSuccessDescriptionSuppliers', { count: suppliers.length }) });
  };
  
  const handleImportButtonClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const text = await file.text();
    let parsedSuppliers: Partial<Supplier>[] = [];
    if (file.name.endsWith('.json')) {
      parsedSuppliers = JSON.parse(text);
    } else {
      toast({ variant: 'destructive', title: t('Common.error'), description: 'Invalid file type. Only JSON is supported for suppliers.' });
      return;
    }
    setSuppliersToImport(parsedSuppliers);
    setIsImportDialogOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleConfirmImport = async (settings: { conflictResolution: 'skip' | 'overwrite' }) => {
    if (!suppliersToImport) return;
    setIsImporting(true);
    setIsImportDialogOpen(false);
    try {
      const response = await fetch('/api/suppliers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suppliers: suppliersToImport, settings }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast({
        title: t('Toasts.importSuccessTitle'),
        description: t('Toasts.importSuccessSummary', result.data),
      });
      // Consider a refetch mechanism if needed after bulk server operations
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('Toasts.importFailedError') });
    } finally {
      setIsImporting(false);
      setSuppliersToImport(null);
      setImportFileName(null);
    }
  };

  const handleSaveGridConfiguration = (
    newColumns: PersistedColumnSetting[],
    newSortConfig: SortConfig<Supplier> | null,
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

  const handleSortRequest = useCallback((key: keyof Supplier | string, direction: 'asc' | 'desc' | null) => {
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

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return suppliers;
    const lowercasedTerm = searchTerm.toLowerCase();
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(lowercasedTerm) ||
      (s.email && s.email.toLowerCase().includes(lowercasedTerm)) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(lowercasedTerm))
    );
  }, [suppliers, searchTerm]);

  const sortedSuppliers = useMemo(() => {
    let sortableItems = [...filteredSuppliers];
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
  }, [filteredSuppliers, sortConfig]);

  if (!hasPermission('manage_suppliers_page')) {
    return <AccessDeniedMessage />;
  }
  
  const finalColumnConfig = useMemo(() => {
    if (columnDefinitions.length === 0) return [];
    return persistedColumnSettings.map(pCol => {
        const definition = columnDefinitions.find(def => def.key === pCol.key);
        return definition ? { ...definition, visible: pCol.visible } : null;
      }).filter(Boolean) as ColumnDefinition<Supplier>[];
  }, [columnDefinitions, persistedColumnSettings]);

  if (isLoadingTranslations || (isLoadingSuppliers && suppliers.length === 0)) {
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
          <Building2 className="mr-3 h-8 w-8" /> {t('SuppliersManager.title')}
        </h1>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
          <TooltipProvider>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button onClick={() => setIsGridSettingsDialogOpen(true)} variant="outline" size="icon" aria-label={t('SuppliersManager.gridSettingsButton')} disabled={!hasPermission('manage_suppliers_page')}>
                          <Settings className="h-5 w-5" />
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{t('SuppliersManager.gridSettingsButton')}</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button onClick={handleImportButtonClick} variant="outline" size="icon" aria-label={t('SuppliersManager.importSuppliersButton')} disabled={isImporting || !hasPermission('manage_suppliers_page')}>
                          {isImporting ? <Loader2 className="h-5 w-5 animate-spin"/> : <Upload className="h-5 w-5" />}
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{t('SuppliersManager.importSuppliersButton')}</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button onClick={handleExport} variant="outline" size="icon" aria-label={t('SuppliersManager.exportSuppliersButton')} disabled={!hasPermission('manage_suppliers_page')}>
                          <Download className="h-5 w-5" />
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{t('SuppliersManager.exportSuppliersButton')}</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90" size="icon" disabled={!hasPermission('manage_suppliers_page')} aria-label={t('SuppliersManager.addNewSupplierButton')}>
                          <PlusCircle className="h-5 w-5" />
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{t('SuppliersManager.addNewSupplierButton')}</p></TooltipContent>
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
              placeholder={t('SuppliersManager.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full max-w-sm"
            />
          </div>
          <SupplierListTable 
            suppliers={sortedSuppliers} 
            onEditSupplier={handleEditSupplierTrigger}
            onDeleteSupplier={handleDeleteSupplierTrigger}
            onSort={handleSortRequest}
            currentSortKey={sortConfig?.key}
            currentSortDirection={sortConfig?.direction}
            displayColumns={finalColumnConfig.filter(c => c.visible)}
            columnDefinitions={columnDefinitions}
            groupingKeys={groupingKeys}
            onToggleGroup={handleToggleGroupingKey}
          />
        </CardContent>
      </Card>
      
      <GridSettingsDialog<Supplier>
        open={isGridSettingsDialogOpen}
        onOpenChange={setIsGridSettingsDialogOpen}
        pagePath={PAGE_PATH}
        allColumnDefinitions={columnDefinitions}
        currentPersistedSettings={persistedColumnSettings}
        currentSortConfig={sortConfig}
        currentGroupingKeys={groupingKeys}
        onSave={handleSaveGridConfiguration}
      />
      
      {suppliersToImport && (
        <ImportSettingsDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          fileName={importFileName || ''}
          itemCount={suppliersToImport.length}
          onConfirmImport={handleConfirmImport}
          isImporting={isImporting}
        />
      )}

      <AddSupplierDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddSupplier={handleAddSupplier}
      />

      {editingSupplier && (
        <EditSupplierDialog
          open={isEditDialogOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingSupplier(null); 
            setIsEditDialogOpen(isOpen);
          }}
          supplier={editingSupplier}
          onSaveSupplier={handleSaveEditedSupplier}
        />
      )}

      {supplierToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={(isOpen) => {
          if (!isOpen) setSupplierToDelete(null); 
          setShowDeleteConfirmDialog(isOpen);
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('SuppliersManager.deleteDialogTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('SuppliersManager.deleteDialogDescription', {supplierName: supplierToDelete?.name || 'this supplier'})}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('SuppliersManager.deleteDialogCancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteSupplier} 
                className={buttonVariants({ variant: "destructive" })}
              >
                {t('SuppliersManager.deleteDialogConfirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
