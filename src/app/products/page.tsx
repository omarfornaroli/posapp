
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AddProductDialog from '@/components/products/AddProductDialog';
import EditProductDialog from '@/components/products/EditProductDialog';
import ProductListTable from '@/components/products/ProductListTable';
import AdvancedImportDialog from '@/components/shared/AdvancedImportDialog';
import GridSettingsDialog from '@/components/products/GridSettingsDialog';
import type { Product as ProductType, SortConfig, ColumnDefinition, PersistedColumnSetting, GridSetting, GroupedTableItem, GridTemplate, ModelFieldDefinition, ColumnMapping } from '@/types';
import { PlusCircle, Loader2, Download, Upload, Settings, ShieldAlert, FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
import { useDexieProducts } from '@/hooks/useDexieProducts';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const PAGE_PATH = "/products"; 

export default function ProductsPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const { products, isLoading: isLoadingProducts, addProduct, updateProduct, deleteProduct } = useDexieProducts();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductType | null>(null);
  
  const { toast } = useToast();

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductType | null>(null);

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [sortConfig, setSortConfig] = useState<SortConfig<ProductType> | null>(null);
  const [isGridSettingsDialogOpen, setIsGridSettingsDialogOpen] = useState(false);
  const [groupingKeys, setGroupingKeys] = useState<string[]>([]);

  const [columnDefinitions, setColumnDefinitions] = useState<ColumnDefinition<ProductType>[]>([]);
  const [persistedColumnSettings, setPersistedColumnSettings] = useState<PersistedColumnSetting[]>([]);

  const productModelFields: ModelFieldDefinition[] = useMemo(() => {
    if (isLoadingTranslations) return [];
    return [
      { key: 'name', label: t('AddProductDialog.nameLabel'), type: 'string', isRequired: true },
      { key: 'barcode', label: t('AddProductDialog.barcodeLabel'), type: 'string', isRequired: true },
      { key: 'price', label: t('AddProductDialog.priceLabel'), type: 'number', isRequired: true },
      { key: 'quantity', label: t('AddProductDialog.quantityLabel'), type: 'number', isRequired: true },
      { key: 'category', label: t('AddProductDialog.categoryLabel'), type: 'string', isRequired: true },
      { key: 'cost', label: t('AddProductDialog.costLabel'), type: 'number' },
      { key: 'markup', label: t('AddProductDialog.markupLabel'), type: 'number' },
      { key: 'lowStockWarning', label: t('AddProductDialog.lowStockWarningLabel'), type: 'boolean'},
      { key: 'warningQuantity', label: t('AddProductDialog.warningQuantityLabel'), type: 'number'},
      { key: 'supplier', label: t('AddProductDialog.supplierLabel'), type: 'relation', relatedModel: 'Supplier', relatedFieldOptions: ['name', 'id'] },
      { key: 'sku', label: t('AddProductDialog.skuLabel'), type: 'string' },
      { key: 'description', label: t('AddProductDialog.descriptionLabel'), type: 'string' },
      { key: 'isEnabled', label: t('AddProductDialog.isEnabledLabel'), type: 'boolean' },
      { key: 'isService', label: t('AddProductDialog.isServiceLabel'), type: 'boolean' },
    ];
  }, [isLoadingTranslations, t]);

  const getDefaultColumnDefinitions = useCallback((translateFn: typeof t): ColumnDefinition<ProductType>[] => [
    { key: 'imageUrl', label: translateFn('ProductListTable.headerImage'), isSortable: false, isGroupable: false, className: "w-[60px]" },
    { key: 'name', label: translateFn('AddProductDialog.nameLabel'), isSortable: true, isGroupable: true, className: "min-w-[180px]" },
    { key: 'category', label: translateFn('AddProductDialog.categoryLabel'), isSortable: true, isGroupable: true, className: "min-w-[100px]" },
    { key: 'sku', label: translateFn('AddProductDialog.skuLabel'), isSortable: true, isGroupable: false, className: "min-w-[100px]" },
    { key: 'barcode', label: translateFn('AddProductDialog.barcodeLabel'), isSortable: false, isGroupable: false, className: "min-w-[100px]" },
    { key: 'price', label: translateFn('AddProductDialog.priceLabel'), isSortable: true, isGroupable: false, className: "text-right min-w-[80px]" },
    { key: 'cost', label: translateFn('AddProductDialog.costLabel'), isSortable: true, isGroupable: false, className: "text-right min-w-[80px]" },
    { key: 'quantity', label: translateFn('AddProductDialog.quantityLabel'), isSortable: true, isGroupable: false, className: "text-center min-w-[80px]" },
    { key: 'isEnabled', label: translateFn('AddProductDialog.isEnabledLabel'), isSortable: true, isGroupable: true, className: "text-center min-w-[80px]" },
    { key: 'description', label: translateFn('AddProductDialog.descriptionLabel'), visible: false, isSortable: false, isGroupable: false, className: "min-w-[200px]" },
    { key: 'supplier', label: translateFn('AddProductDialog.supplierLabel'), visible: false, isSortable: true, isGroupable: true, className: "min-w-[150px]" },
  ], []);

  const productPageTemplates: GridTemplate<ProductType>[] = useMemo(() => {
    if (isLoadingTranslations) return [];
    const allKeysForDefault = getDefaultColumnDefinitions(t).map(c => ({ key: String(c.key), visible: c.visible !== false }));
    return [
      {
        id: 'default', name: t('GridSettingsDialog.templateDefault') || 'Default',
        config: {
          columns: allKeysForDefault,
          sortConfig: { key: 'name', direction: 'asc' },
          groupingKeys: []
        }
      },
      {
        id: 'inventory', name: t('GridSettingsDialog.templateInventory') || 'Inventory Focus',
        config: {
          columns: [
            { key: 'name', visible: true }, { key: 'sku', visible: true }, { key: 'barcode', visible: true },
            { key: 'quantity', visible: true }, { key: 'reorderPoint', visible: true }, { key: 'warningQuantity', visible: true },
            { key: 'supplier', visible: true }, { key: 'cost', visible: true }, { key: 'price', visible: true },
            ...allKeysForDefault.filter(k => !['name', 'sku', 'barcode', 'quantity', 'reorderPoint', 'warningQuantity', 'supplier', 'cost', 'price'].includes(k.key))
                                .map(k => ({ ...k, visible: false }))
          ],
          sortConfig: { key: 'quantity', direction: 'asc' },
          groupingKeys: ['category', 'supplier'] 
        }
      },
      {
        id: 'compact', name: t('GridSettingsDialog.templateCompact') || 'Compact View',
        config: {
          columns: [
            { key: 'name', visible: true }, { key: 'barcode', visible: true }, 
            { key: 'price', visible: true }, { key: 'quantity', visible: true }, { key: 'category', visible: true },
             ...allKeysForDefault.filter(k => !['name', 'barcode', 'price', 'quantity', 'category'].includes(k.key))
                                .map(k => ({ ...k, visible: false }))
          ],
          sortConfig: null,
          groupingKeys: []
        }
      }
    ];
  }, [isLoadingTranslations, t, getDefaultColumnDefinitions]);

  useEffect(() => {
    if (!isLoadingTranslations) {
      const defaultCols = getDefaultColumnDefinitions(t);
      setColumnDefinitions(defaultCols);
      if (persistedColumnSettings.length === 0) {
        setPersistedColumnSettings(
          defaultCols.map(def => ({ key: String(def.key), visible: def.visible !== false }))
        );
      }
    }
  }, [isLoadingTranslations, t, getDefaultColumnDefinitions, persistedColumnSettings.length]);

  const persistGridSettingsToApi = useCallback(async (settingsToPersist: GridSetting) => {
    try {
      const response = await fetch('/api/grid-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToPersist),
      });
      if (!response.ok) throw new Error('Failed to save grid settings via API');
    } catch (error) {
      console.error('Error persisting grid settings to API:', error);
      toast({ variant: 'destructive', title: t('Common.error'), description: 'Failed to save grid preferences to server.' });
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
            const defaultCols = getDefaultColumnDefinitions(t); 
            
            const reconciledColumns: PersistedColumnSetting[] = (savedSettings.columns || []).map((savedCol: any) => {
              const def = defaultCols.find(d => d.key === savedCol.key);
              return {
                key: savedCol.key,
                visible: def ? savedCol.visible : (def?.visible !== false), 
              };
            });

            defaultCols.forEach(def => {
                if (!reconciledColumns.find(rc => rc.key === def.key)) {
                    reconciledColumns.push({ key: String(def.key), visible: def.visible !== false });
                }
            });
            setPersistedColumnSettings(reconciledColumns);
            setSortConfig(savedSettings.sortConfig || null);
            setGroupingKeys(Array.isArray(savedSettings.groupingKeys) ? savedSettings.groupingKeys : []);
          } else {
            const defaultCols = getDefaultColumnDefinitions(t);
            setPersistedColumnSettings(defaultCols.map(def => ({ key: String(def.key), visible: def.visible !== false })));
            setSortConfig(null);
            setGroupingKeys([]);
          }
        } else {
            const defaultCols = getDefaultColumnDefinitions(t);
            setPersistedColumnSettings(defaultCols.map(def => ({ key: String(def.key), visible: def.visible !== false })));
            setSortConfig(null);
            setGroupingKeys([]);
        }
      } catch (error) {
        console.error('Error fetching grid settings:', error);
         const defaultCols = getDefaultColumnDefinitions(t);
         setPersistedColumnSettings(defaultCols.map(def => ({ key: String(def.key), visible: def.visible !== false })));
         setSortConfig(null);
         setGroupingKeys([]);
      }
    };
    if (!isLoadingTranslations) { 
        fetchGridSettings();
    }
  }, [isLoadingTranslations, t, getDefaultColumnDefinitions]);

  const handleAddProduct = async (newProductData: Omit<ProductType, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await addProduct(newProductData);
      toast({
        title: t('Toasts.productAddedTitle'),
        description: t('Toasts.productAddedDescription', { productName: newProductData.name }),
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : 'Failed to add product locally',
      });
    }
  };

  const handleEditProductTrigger = (productId: string) => {
    const productToEdit = products.find(p => p.id === productId);
    if (productToEdit) {
      setEditingProduct(productToEdit);
      setIsEditDialogOpen(true);
    } else {
      toast({ title: t('ProductManagementPage.errorNotFoundForEditing'), variant: 'destructive' });
    }
  };

  const handleSaveEditedProduct = async (updatedProductData: ProductType) => {
    if (!editingProduct) return;
    try {
      await updateProduct(updatedProductData);
      toast({
        title: t('Toasts.productUpdatedTitle'),
        description: t('Toasts.productUpdatedDescription', {productName: updatedProductData.name}),
      });
      setIsEditDialogOpen(false);
      setEditingProduct(null);
    } catch (error) {
       toast({ 
         variant: 'destructive',
         title: t('Common.error'), 
         description: error instanceof Error ? error.message : 'Failed to update product locally.' 
        });
    }
  };

  const handleDeleteProductTrigger = (product: ProductType) => {
    setProductToDelete(product);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete.id);
      toast({
        title: t('Toasts.productDeletedTitle'),
        description: t('Toasts.productDeletedDescription', {productName: productToDelete.name}),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : 'Failed to delete product locally.',
      });
    } finally {
      setShowDeleteConfirmDialog(false);
      setProductToDelete(null);
    }
  };

  const exportData = (format: 'json' | 'csv' | 'xlsx') => {
    if (products.length === 0) {
      toast({ title: t('Toasts.noProductsToExportTitle'), description: t('Toasts.noProductsToExportDescription'), variant: 'default'});
      return;
    }

    const dataToExport = products.map(p => ({
      ...p,
      supplier: (p.supplier as any)?.name || p.supplier || '', // Handle populated supplier
    }));

    if (format === 'json') {
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = "products_export.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      if (format === 'csv') {
        const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'products_export.csv';
        link.click();
        URL.revokeObjectURL(url);
      } else { // xlsx
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
        XLSX.writeFile(workbook, "products_export.xlsx");
      }
    }
    toast({ title: t('Toasts.exportSuccessTitle'), description: t('Toasts.exportSuccessDescription', { count: products.length }) });
  };
  
  const handleConfirmAdvancedImport = async (data: {
    dataRows: Record<string, any>[];
    mappings: ColumnMapping[];
    settings: { conflictResolution: 'skip' | 'overwrite' };
  }) => {
    setIsImporting(true);
    setIsImportDialogOpen(false);
    try {
      const response = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast({
        title: t('Toasts.importSuccessTitle'),
        description: t('Toasts.importSuccessSummary', result.data),
      });
      // After a bulk import, we should refetch everything to sync the local DB
      if (typeof window !== 'undefined') window.location.reload();
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('Toasts.importFailedError') });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSortRequest = useCallback((key: keyof ProductType | string, direction: 'asc' | 'desc' | null) => {
    const newSortConfig = direction === null ? null : { key, direction };
    setSortConfig(newSortConfig);
    persistGridSettingsToApi({ 
        pagePath: PAGE_PATH,
        columns: persistedColumnSettings, 
        sortConfig: newSortConfig, 
        groupingKeys 
    });
  }, [persistedColumnSettings, groupingKeys, persistGridSettingsToApi]);
  
  const handleToggleGroupingKey = useCallback((key: string) => {
    setGroupingKeys(currentGroupingKeys => {
        const newKeys = currentGroupingKeys.includes(key)
            ? currentGroupingKeys.filter(k => k !== key)
            : [...currentGroupingKeys, key];
        
        persistGridSettingsToApi({
            pagePath: PAGE_PATH,
            columns: persistedColumnSettings, 
            sortConfig: sortConfig,           
            groupingKeys: newKeys             
        });
        return newKeys; 
    });
  }, [persistedColumnSettings, sortConfig, persistGridSettingsToApi]);

  const groupDataRecursivelyHelper = useCallback((
    items: ProductType[],
    keys: string[],
    tFunction: (key: string, params?: any, options?: { fallback?: string }) => string,
    currentSortConfig: SortConfig<ProductType> | null,
    currentLevel: number = 0
  ): Array<ProductType | GroupedTableItem<ProductType>> => {
    if (!keys || keys.length === 0) {
      if (currentSortConfig && currentSortConfig.key) {
        return [...items].sort((a, b) => {
          const valA = (a as any)[currentSortConfig.key!];
          const valB = (b as any)[currentSortConfig.key!];
          if (valA == null && valB != null) return 1;
          if (valA != null && valB == null) return -1;
          if (valA == null && valB == null) return 0;
          let comparison = 0;
          if (typeof valA === 'number' && typeof valB === 'number') comparison = valA - valB;
          else if (typeof valA === 'string' && typeof valB === 'string') comparison = valA.localeCompare(valB);
          else if (typeof valA === 'boolean' && typeof valB === 'boolean') comparison = valA === valB ? 0 : valA ? -1 : 1;
          else comparison = String(valA).localeCompare(String(valB));
          return currentSortConfig.direction === 'asc' ? comparison : -comparison;
        });
      }
      return items;
    }

    const currentGroupKey = keys[0];
    const remainingKeys = keys.slice(1);

    const grouped = items.reduce((acc, product) => {
      let groupValue: string;
      if (currentGroupKey === 'supplier') {
        groupValue = (product.supplier as any)?.name || tFunction('ProductListTable.unassignedSupplier', {}, {fallback: 'Unassigned'});
      } else {
        groupValue = String((product as any)[currentGroupKey] ?? tFunction('ProductListTable.na', {}, {fallback: 'N/A'}));
      }
      
      if (!acc[groupValue]) acc[groupValue] = [];
      acc[groupValue].push(product);
      return acc;
    }, {} as Record<string, ProductType[]>);

    const result: Array<GroupedTableItem<ProductType>> = [];
    Object.keys(grouped).sort((a, b) => a.localeCompare(b)).forEach(groupValue => {
      result.push({
        isGroupHeader: true,
        groupKey: currentGroupKey,
        groupValue,
        level: currentLevel,
        items: groupDataRecursivelyHelper(grouped[groupValue], remainingKeys, tFunction, currentSortConfig, currentLevel + 1),
      });
    });
    return result;
  }, []); 


  const processedProductsForTable = useMemo((): Array<ProductType | GroupedTableItem<ProductType>> => {
    const itemsToProcess = [...products];

    if (Array.isArray(groupingKeys) && groupingKeys.length > 0) {
      return groupDataRecursivelyHelper(itemsToProcess, groupingKeys, t, sortConfig);
    } else {
      if (sortConfig && sortConfig.key) {
        return itemsToProcess.sort((a, b) => {
          const valA = (a as any)[sortConfig.key!];
          const valB = (b as any)[sortConfig.key!];
          if (valA == null && valB != null) return 1;
          if (valA != null && valB == null) return -1;
          if (valA == null && valB == null) return 0;
          let comparison = 0;
          if (typeof valA === 'number' && typeof valB === 'number') comparison = valA - valB;
          else if (typeof valA === 'string' && typeof valB === 'string') comparison = valA.localeCompare(valB);
          else if (typeof valA === 'boolean' && typeof valB === 'boolean') comparison = valA === valB ? 0 : valA ? -1 : 1;
          else comparison = String(valA).localeCompare(String(valB));
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
      }
      return itemsToProcess;
    }
  }, [products, sortConfig, groupingKeys, t, groupDataRecursivelyHelper]);

  const handleSaveGridConfiguration = (
    newColumns: PersistedColumnSetting[],
    newSortConfig: SortConfig<ProductType> | null,
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

  const finalColumnConfig = useMemo(() => {
    if (columnDefinitions.length === 0) return []; 
    const persistedMap = new Map(persistedColumnSettings.map(p => [p.key, p]));
    
    const orderedAndFiltered: ColumnDefinition<ProductType>[] = persistedColumnSettings
      .map(pCol => {
        const definition = columnDefinitions.find(def => def.key === pCol.key);
        return definition ? { ...definition, visible: pCol.visible } : null;
      })
      .filter(Boolean) as ColumnDefinition<ProductType>[];
  
    columnDefinitions.forEach(def => {
      if (!orderedAndFiltered.find(fCol => fCol.key === def.key)) {
        orderedAndFiltered.push({ ...def, visible: def.visible !== false });
      }
    });
    return orderedAndFiltered.filter(col => col.visible);
  }, [columnDefinitions, persistedColumnSettings]);

  if (!hasPermission('manage_products_page')) {
    return <AccessDeniedMessage />;
  }

  if (isLoadingTranslations || (isLoadingProducts && products.length === 0)) { 
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,64px)-4rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-semibold text-primary">{t('ProductManagementPage.title')}</h1>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setIsGridSettingsDialogOpen(true)} variant="outline" size="icon" aria-label={t('ProductManagementPage.gridSettingsButton')} disabled={!hasPermission('manage_products_page')}>
                  <Settings className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('ProductManagementPage.gridSettingsButton')}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setIsImportDialogOpen(true)} variant="outline" size="icon" disabled={isImporting || !hasPermission('manage_products_page')} aria-label={t('ProductManagementPage.importProductsButton')}>
                  {isImporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isImporting ? t('Toasts.importingButton') : t('ProductManagementPage.importProductsButton')}</p>
              </TooltipContent>
            </Tooltip>

             <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" disabled={!hasPermission('manage_products_page')} aria-label={t('ProductManagementPage.exportProductsButton')}>
                      <Download className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('ProductManagementPage.exportProductsButton')}</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportData('json')}><FileJson className="mr-2 h-4 w-4"/><span>{t('ExportOptions.json')}</span></DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData('csv')}><FileText className="mr-2 h-4 w-4"/><span>{t('ExportOptions.csv')}</span></DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData('xlsx')}><FileSpreadsheet className="mr-2 h-4 w-4"/><span>{t('ExportOptions.excel')}</span></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90" size="icon" disabled={!hasPermission('manage_products_page')} aria-label={t('ProductManagementPage.addNewProductButton')}>
                  <PlusCircle className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('ProductManagementPage.addNewProductButton')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <Card className="shadow-xl">
        <CardContent className="pt-6">
          {(isLoadingProducts && products.length === 0 && !isImporting) || columnDefinitions.length === 0 ? ( 
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <ProductListTable 
              processedProducts={processedProductsForTable}
              columnDefinitions={columnDefinitions} 
              displayColumns={finalColumnConfig}    
              onEditProduct={handleEditProductTrigger}
              onDeleteProduct={(productId) => {
                const product = products.find(p => p.id === productId);
                if (product) handleDeleteProductTrigger(product);
              }}
              onSort={handleSortRequest}
              currentSortKey={sortConfig?.key}
              currentSortDirection={sortConfig?.direction}
              groupingKeys={groupingKeys}
              onToggleGroup={handleToggleGroupingKey}
            />
          )}
        </CardContent>
      </Card>

      <AddProductDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddProduct={handleAddProduct}
      />

      {editingProduct && (
        <EditProductDialog
          open={isEditDialogOpen}
          onOpenChange={(isOpen) => {
            setIsEditDialogOpen(isOpen);
            if (!isOpen) {
              setEditingProduct(null); 
            }
          }}
          product={editingProduct}
          onSaveProduct={handleSaveEditedProduct}
        />
      )}
      
      <AdvancedImportDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          modelName="Product"
          modelFields={productModelFields}
          onConfirmImport={handleConfirmAdvancedImport}
          isImporting={isImporting}
      />
      
      <GridSettingsDialog<ProductType>
        open={isGridSettingsDialogOpen}
        onOpenChange={setIsGridSettingsDialogOpen}
        pagePath={PAGE_PATH}
        allColumnDefinitions={columnDefinitions} 
        currentPersistedSettings={persistedColumnSettings}
        currentSortConfig={sortConfig}
        currentGroupingKeys={groupingKeys}
        templates={productPageTemplates}
        onSave={handleSaveGridConfiguration}
      />

      {productToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={(isOpen) => {
          setShowDeleteConfirmDialog(isOpen);
          if (!isOpen) {
            setProductToDelete(null); 
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('ProductManagementPage.deleteDialogTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('ProductManagementPage.deleteDialogDescription', {productName: productToDelete?.name || 'this product'})}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('ProductManagementPage.deleteDialogCancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteProduct} 
                className={buttonVariants({ variant: "destructive" })}
              >
                {t('ProductManagementPage.deleteDialogConfirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
