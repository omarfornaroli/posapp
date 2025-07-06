'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Percent, Loader2, Settings, Upload, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Tax, SortConfig } from '@/types';
import AddTaxDialog from '@/components/taxes/AddTaxDialog';
import EditTaxDialog from '@/components/taxes/EditTaxDialog';
import TaxListTable from '@/components/taxes/TaxListTable';
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
import { useDexieTaxes } from '@/hooks/useDexieTaxes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import ImportSettingsDialog from '@/components/shared/ImportSettingsDialog';

export default function TaxesManagerPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { taxes, isLoading: isLoadingTaxes, addTax, updateTax, deleteTax } = useDexieTaxes();
  const [isAddTaxDialogOpen, setIsAddTaxDialogOpen] = useState(false);
  const [isEditTaxDialogOpen, setIsEditTaxDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  
  const { toast } = useToast();

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [taxToDelete, setTaxToDelete] = useState<Tax | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig<Tax> | null>(null);
  
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [taxesToImport, setTaxesToImport] = useState<Partial<Tax>[] | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleComingSoon = (featureName: string) => {
    toast({
        title: t('Common.featureComingSoonTitle'),
        description: `${featureName} for taxes will be available in a future update.`,
    });
  };
  
  const handleAddTax = async (newTaxData: Omit<Tax, 'id' | 'createdAt' | 'updatedAt'>) => {
     try {
      await addTax(newTaxData);
      toast({
        title: t('Toasts.taxAddedTitle'),
        description: t('Toasts.taxAddedDescription', { taxName: newTaxData.name }),
      });
      setIsAddTaxDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : 'Failed to add tax',
      });
    }
  };

  const handleEditTaxTrigger = (taxId: string) => {
    const taxToEdit = taxes.find(p => p.id === taxId);
    if (taxToEdit) {
      setEditingTax(taxToEdit);
      setIsEditTaxDialogOpen(true);
    } else {
      toast({ title: t('Common.error'), description: t('TaxesManagerPage.errorNotFoundForEditing'), variant: 'destructive' });
    }
  };

  const handleSaveEditedTax = async (updatedTaxData: Tax) => {
    try {
      await updateTax(updatedTaxData);
      toast({
        title: t('Toasts.taxUpdatedTitle'),
        description: t('Toasts.taxUpdatedDescription', {taxName: updatedTaxData.name}),
      });
      setIsEditTaxDialogOpen(false);
      setEditingTax(null);
    } catch (error) {
       toast({ 
         variant: 'destructive',
         title: t('Common.error'), 
         description: error instanceof Error ? error.message : t('TaxesManagerPage.errorFailedToUpdateTaxAPI')
        });
    }
  };

  const handleDeleteTaxTrigger = (taxId: string) => {
    const tax = taxes.find(p => p.id === taxId);
    if (tax) {
      setTaxToDelete(tax);
      setShowDeleteConfirmDialog(true);
    } else {
       toast({ title: t('Common.error'), description: t('TaxesManagerPage.errorNotFoundForDeletion'), variant: 'destructive' });
    }
  };

  const confirmDeleteTax = async () => {
    if (!taxToDelete) return;
    try {
      await deleteTax(taxToDelete.id);
      toast({
        title: t('Toasts.taxDeletedTitle'),
        description: t('Toasts.taxDeletedDescription', {taxName: taxToDelete.name}),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('TaxesManagerPage.errorFailedToDeleteTaxAPI'),
      });
    } finally {
      setShowDeleteConfirmDialog(false);
      setTaxToDelete(null);
    }
  };
  
  const handleExport = () => {
    if (taxes.length === 0) {
      toast({ title: t('SalesReportPage.noDataToExportTitle'), variant: 'default'});
      return;
    }
    const jsonString = JSON.stringify(taxes, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "taxes_export.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: t('Toasts.exportSuccessTitle'), description: `${taxes.length} taxes exported.` });
  };
  
  const handleImportButtonClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const text = await file.text();
    let parsedTaxes: Partial<Tax>[] = [];

    if (file.name.endsWith('.json')) {
      parsedTaxes = JSON.parse(text);
    } else {
      toast({ variant: 'destructive', title: t('Common.error'), description: t('ProductManagementPage.invalidFileTypeError') });
      return;
    }

    setTaxesToImport(parsedTaxes);
    setIsImportDialogOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleConfirmImport = async (settings: { conflictResolution: 'skip' | 'overwrite' }) => {
    if (!taxesToImport) return;
    setIsImporting(true);
    setIsImportDialogOpen(false);
    try {
      const response = await fetch('/api/taxes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxes: taxesToImport, settings }),
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
      setTaxesToImport(null);
      setImportFileName(null);
    }
  };

  const handleSortRequest = useCallback((key: keyof Tax | string, direction: 'asc' | 'desc' | null) => {
    if (direction === null) {
      setSortConfig(null);
    } else {
      setSortConfig({ key, direction });
    }
  }, []);

  const sortedTaxes = useMemo(() => {
    let sortableItems = [...taxes];
    if (sortConfig && sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = (a as any)[sortConfig.key];
        const valB = (b as any)[sortConfig.key];

        if (valA == null && valB != null) return 1;
        if (valA != null && valB == null) return -1;
        if (valA == null && valB == null) return 0;
        
        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
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
  }, [taxes, sortConfig]);

  if (isLoadingTranslations || (isLoadingTaxes && taxes.length === 0)) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,64px)-4rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!hasPermission('manage_taxes_page')) {
    return <AccessDeniedMessage />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <Percent className="mr-3 h-8 w-8" /> {t('TaxesManagerPage.title')}
        </h1>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={() => handleComingSoon('Grid Settings')} variant="outline" size="icon" aria-label={t('ProductManagementPage.gridSettingsButton')} disabled={!hasPermission('manage_taxes_page')}>
                      <Settings className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('ProductManagementPage.gridSettingsButton')}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={handleImportButtonClick} variant="outline" size="icon" aria-label={t('ProductManagementPage.importProductsButton')} disabled={isImporting || !hasPermission('manage_taxes_page')}>
                     {isImporting ? <Loader2 className="h-5 w-5 animate-spin"/> : <Upload className="h-5 w-5" />}
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('ProductManagementPage.importProductsButton')}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={handleExport} variant="outline" size="icon" aria-label={t('ProductManagementPage.exportProductsButton')} disabled={!hasPermission('manage_taxes_page')}>
                      <Download className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('ProductManagementPage.exportProductsButton')}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={() => setIsAddTaxDialogOpen(true)} className="bg-primary hover:bg-primary/90" size="icon" aria-label={t('TaxesManagerPage.addNewTaxButton')} disabled={!hasPermission('manage_taxes_page')}>
                      <PlusCircle className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('TaxesManagerPage.addNewTaxButton')}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardContent className="pt-6">
          {isLoadingTaxes && taxes.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <TaxListTable
              taxes={sortedTaxes}
              onEditTax={handleEditTaxTrigger}
              onDeleteTax={handleDeleteTaxTrigger}
              onSort={handleSortRequest}
              currentSortKey={sortConfig?.key}
              currentSortDirection={sortConfig?.direction}
            />
          )}
        </CardContent>
      </Card>
      
      {taxesToImport && (
        <ImportSettingsDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          fileName={importFileName || ''}
          itemCount={taxesToImport.length}
          onConfirmImport={handleConfirmImport}
          isImporting={isImporting}
        />
      )}

      <AddTaxDialog
        open={isAddTaxDialogOpen}
        onOpenChange={setIsAddTaxDialogOpen}
        onAddTax={handleAddTax}
      />

      {editingTax && (
        <EditTaxDialog
          open={isEditTaxDialogOpen}
          onOpenChange={(isOpen) => {
            setIsEditTaxDialogOpen(isOpen);
            if (!isOpen) {
              setEditingTax(null); 
            }
          }}
          tax={editingTax}
          onSaveTax={handleSaveEditedTax}
        />
      )}

      {taxToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={(isOpen) => {
          setShowDeleteConfirmDialog(isOpen);
          if (!isOpen) {
            setTaxToDelete(null); 
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('TaxesManagerPage.deleteDialogTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('TaxesManagerPage.deleteDialogDescription', {taxName: taxToDelete?.name || 'this tax'})}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('TaxesManagerPage.deleteDialogCancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteTax} 
                className={buttonVariants({ variant: "destructive" })}
              >
                {t('TaxesManagerPage.deleteDialogConfirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
