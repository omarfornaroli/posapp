
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlusCircle, TicketPercent, Loader2, Settings, Upload, Download, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Promotion, SortConfig, ColumnDefinition, PersistedColumnSetting, GridSetting, GridTemplate } from '@/types';
import AddPromotionDialog from '@/components/promotions/AddPromotionDialog';
import EditPromotionDialog from '@/components/promotions/EditPromotionDialog';
import PromotionListTable from '@/components/promotions/PromotionListTable';
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
import { useDexiePromotions } from '@/hooks/useDexiePromotions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const PAGE_PATH = "/promotions";

export default function PromotionsManagerPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const { promotions, isLoading: isLoadingPromotions, addPromotion, updatePromotion, deletePromotion } = useDexiePromotions();
  const [isAddPromotionDialogOpen, setIsAddPromotionDialogOpen] = useState(false);
  const [isEditPromotionDialogOpen, setIsEditPromotionDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  
  const { toast } = useToast();

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<Promotion | null>(null);

  const [isGridSettingsDialogOpen, setIsGridSettingsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [promotionsToImport, setPromotionsToImport] = useState<Partial<Promotion>[] | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sortConfig, setSortConfig] = useState<SortConfig<Promotion> | null>(null);
  const [groupingKeys, setGroupingKeys] = useState<string[]>([]);
  const [columnDefinitions, setColumnDefinitions] = useState<ColumnDefinition<Promotion>[]>([]);
  const [persistedColumnSettings, setPersistedColumnSettings] = useState<PersistedColumnSetting[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const getDefaultColumnDefinitions = useCallback((translateFn: typeof t): ColumnDefinition<Promotion>[] => [
    { key: 'name', label: translateFn('PromotionListTable.headerName'), isSortable: true, isGroupable: true },
    { key: 'discountValue', label: translateFn('PromotionListTable.headerDiscount'), isSortable: true, isGroupable: false },
    { key: 'startDate', label: translateFn('PromotionListTable.headerDates'), isSortable: true, isGroupable: false },
    { key: 'conditions', label: translateFn('PromotionListTable.headerApplicability'), isSortable: false, isGroupable: true },
    { key: 'isActive', label: translateFn('PromotionListTable.headerStatus'), isSortable: true, isGroupable: true, className: 'text-center' },
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

  const handleAddPromotion = async (newPromotionData: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>) => {
     try {
      await addPromotion(newPromotionData);
      toast({
        title: t('Toasts.promotionAddedTitle'),
        description: t('Toasts.promotionAddedDescription', { promotionName: newPromotionData.name }),
      });
      setIsAddPromotionDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : 'Failed to add promotion',
      });
    }
  };

  const handleEditPromotionTrigger = (promotionId: string) => {
    const promotionToEdit = promotions.find(p => p.id === promotionId);
    if (promotionToEdit) {
      setEditingPromotion(promotionToEdit);
      setIsEditPromotionDialogOpen(true);
    } else {
      toast({ title: t('Common.error'), description: t('PromotionsManagerPage.errorNotFoundForEditing'), variant: 'destructive' });
    }
  };

  const handleSaveEditedPromotion = async (updatedPromotionData: Promotion) => {
    if (!editingPromotion) return;
    try {
      await updatePromotion(updatedPromotionData);
      toast({
        title: t('Toasts.promotionUpdatedTitle'),
        description: t('Toasts.promotionUpdatedDescription', {promotionName: updatedPromotionData.name}),
      });
      setIsEditPromotionDialogOpen(false);
      setEditingPromotion(null);
    } catch (error) {
       toast({ 
         variant: 'destructive',
         title: t('Common.error'), 
         description: error instanceof Error ? error.message : t('PromotionsManagerPage.errorFailedToUpdatePromotionAPI')
        });
    }
  };

  const handleDeletePromotionTrigger = (promotionId: string) => {
    const promotion = promotions.find(p => p.id === promotionId);
    if (promotion) {
      setPromotionToDelete(promotion);
      setShowDeleteConfirmDialog(true);
    } else {
       toast({ title: t('Common.error'), description: t('PromotionsManagerPage.errorNotFoundForDeletion'), variant: 'destructive' });
    }
  };

  const confirmDeletePromotion = async () => {
    if (!promotionToDelete) return;
    try {
      await deletePromotion(promotionToDelete.id);
      toast({
        title: t('Toasts.promotionDeletedTitle'),
        description: t('Toasts.promotionDeletedDescription', {promotionName: promotionToDelete.name}),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('PromotionsManagerPage.errorFailedToDeletePromotionAPI'),
      });
    } finally {
      setShowDeleteConfirmDialog(false);
      setPromotionToDelete(null);
    }
  };
  
  const handleExport = () => {
    if (promotions.length === 0) {
      toast({ title: t('Toasts.noProductsToExportTitle'), variant: 'default'});
      return;
    }
    const jsonString = JSON.stringify(promotions, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "promotions_export.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: t('Toasts.exportSuccessTitle'), description: t('Toasts.exportSuccessDescriptionPromotions', { count: promotions.length }) });
  };
  
  const handleImportButtonClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const text = await file.text();
    let parsedPromotions: Partial<Promotion>[] = [];

    if (file.name.endsWith('.json')) {
      parsedPromotions = JSON.parse(text);
    } else {
      toast({ variant: 'destructive', title: t('Common.error'), description: t('ProductManagementPage.invalidFileTypeError') });
      return;
    }

    setPromotionsToImport(parsedPromotions);
    setIsImportDialogOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleConfirmImport = async (settings: { conflictResolution: 'skip' | 'overwrite' }) => {
    if (!promotionsToImport) return;
    setIsImporting(true);
    setIsImportDialogOpen(false);
    try {
      const response = await fetch('/api/promotions/import', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ promotions: promotionsToImport, settings }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast({
        title: t('Toasts.importSuccessTitle'),
        description: t('Toasts.importSuccessSummary', result.data),
      });
      // A full refetch might be needed in a real app
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('Toasts.importFailedError') });
    } finally {
      setIsImporting(false);
      setPromotionsToImport(null);
      setImportFileName(null);
    }
  };

  const handleSortRequest = useCallback((key: keyof Promotion | string, direction: 'asc' | 'desc' | null) => {
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
    newSortConfig: SortConfig<Promotion> | null,
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

  const filteredPromotions = useMemo(() => {
    if (!searchTerm) return promotions;
    const lowercasedTerm = searchTerm.toLowerCase();
    return promotions.filter(p => 
      p.name.toLowerCase().includes(lowercasedTerm) ||
      (p.description && p.description.toLowerCase().includes(lowercasedTerm))
    );
  }, [promotions, searchTerm]);
  
  const sortedPromotions = useMemo(() => {
    let sortableItems = [...filteredPromotions];
    if (sortConfig && sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = (a as any)[sortConfig.key];
        const valB = (b as any)[sortConfig.key];

        if (valA == null && valB != null) return 1;
        if (valA != null && valB == null) return -1;
        if (valA == null && valB == null) return 0;
        
        let comparison = 0;
        if (sortConfig.key === 'startDate' || sortConfig.key === 'endDate') {
            const dateA = valA ? new Date(valA).getTime() : (sortConfig.direction === 'asc' ? Infinity : -Infinity);
            const dateB = valB ? new Date(valB).getTime() : (sortConfig.direction === 'asc' ? Infinity : -Infinity);
            comparison = dateA - dateB;
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
          comparison = valA === valB ? 0 : valA ? -1 : 1;
        } else {
          comparison = String(valA).localeCompare(String(valB));
        }
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [filteredPromotions, sortConfig]);

  if (isLoadingTranslations || (isLoadingPromotions && promotions.length === 0)) {
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
          <TicketPercent className="mr-3 h-8 w-8" /> {t('PromotionsManagerPage.title')}
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
                  <Button onClick={() => setIsAddPromotionDialogOpen(true)} className="bg-primary hover:bg-primary/90" size="icon" aria-label={t('PromotionsManagerPage.addNewPromotionButton')}>
                      <PlusCircle className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('PromotionsManagerPage.addNewPromotionButton')}</p></TooltipContent>
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
              placeholder={t('PromotionsManagerPage.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full max-w-sm"
            />
          </div>
          {isLoadingPromotions && promotions.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <PromotionListTable
              promotions={sortedPromotions}
              onEditPromotion={handleEditPromotionTrigger}
              onDeletePromotion={handleDeletePromotionTrigger}
              onSort={handleSortRequest}
              currentSortKey={sortConfig?.key}
              currentSortDirection={sortConfig?.direction}
            />
          )}
        </CardContent>
      </Card>
      
      <GridSettingsDialog<Promotion>
        open={isGridSettingsDialogOpen}
        onOpenChange={setIsGridSettingsDialogOpen}
        pagePath={PAGE_PATH}
        allColumnDefinitions={columnDefinitions}
        currentPersistedSettings={persistedColumnSettings}
        currentSortConfig={sortConfig}
        currentGroupingKeys={groupingKeys}
        onSave={handleSaveGridConfiguration}
      />
      
      {promotionsToImport && (
        <ImportSettingsDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          fileName={importFileName || ''}
          itemCount={promotionsToImport.length}
          onConfirmImport={handleConfirmImport}
          isImporting={isImporting}
        />
      )}

      <AddPromotionDialog
        open={isAddPromotionDialogOpen}
        onOpenChange={setIsAddPromotionDialogOpen}
        onAddPromotion={handleAddPromotion}
      />

      {editingPromotion && (
        <EditPromotionDialog
          open={isEditPromotionDialogOpen}
          onOpenChange={(isOpen) => {
            setIsEditPromotionDialogOpen(isOpen);
            if (!isOpen) {
              setEditingPromotion(null); 
            }
          }}
          promotion={editingPromotion}
          onSavePromotion={handleSaveEditedPromotion}
        />
      )}

      {promotionToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={(isOpen) => {
          setShowDeleteConfirmDialog(isOpen);
          if (!isOpen) {
            setPromotionToDelete(null); 
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('PromotionsManagerPage.confirmDeleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('PromotionsManagerPage.confirmDeleteDescription', {promotionName: promotionToDelete?.name || 'this promotion'})}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('PromotionsManagerPage.deleteDialogCancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeletePromotion} 
                className={buttonVariants({ variant: "destructive" })}
              >
                {t('PromotionsManagerPage.deleteDialogConfirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
