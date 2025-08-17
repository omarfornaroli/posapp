
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AddSupplierDialog from '@/components/suppliers/AddSupplierDialog';
import EditSupplierDialog from '@/components/suppliers/EditSupplierDialog';
import SupplierListTable from '@/components/suppliers/SupplierListTable';
import type { Supplier, SortConfig, ColumnDefinition, PersistedColumnSetting, GridSetting, GridTemplate } from '@/types';
import { PlusCircle, Building2, Loader2, Settings, Upload, Download } from 'lucide-react';
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
import { useDexieSuppliers } from '@/hooks/useDexieSuppliers';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function SuppliersPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const { suppliers, isLoading: isLoadingSuppliers, addSupplier, updateSupplier, deleteSupplier } = useDexieSuppliers();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  const { toast } = useToast();

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  
  const [sortConfig, setSortConfig] = useState<SortConfig<Supplier> | null>(null);
  const [groupingKeys, setGroupingKeys] = useState<string[]>([]);
  const [columnDefinitions, setColumnDefinitions] = useState<ColumnDefinition<Supplier>[]>([]);
  const [persistedColumnSettings, setPersistedColumnSettings] = useState<PersistedColumnSetting[]>([]);

  const handleAddSupplier = async (newSupplierData: Omit<Supplier, 'id'>) => {
    try {
      await addSupplier(newSupplierData);
      toast({
        title: t('Toasts.supplierAddedTitle'),
        description: t('Toasts.supplierAddedDescription', { supplierName: newSupplierData.name }),
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : 'Failed to add supplier.',
      });
    }
  };

  const handleEditSupplierTrigger = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedSupplier = async (updatedSupplierData: Supplier) => {
    try {
      await updateSupplier(updatedSupplierData);
      toast({
        title: t('Toasts.supplierUpdatedTitle'),
        description: t('Toasts.supplierUpdatedDescription', {supplierName: updatedSupplierData.name}),
      });
      setIsEditDialogOpen(false);
      setEditingSupplier(null);
    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : 'Failed to update supplier.' });
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
      toast({
        title: t('Toasts.supplierDeletedTitle'),
        description: t('Toasts.supplierDeletedDescription', {supplierName: supplierToDelete.name}),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : 'Failed to delete supplier.',
      });
    } finally {
      setShowDeleteConfirmDialog(false);
      setSupplierToDelete(null);
    }
  };
  
  const handleSortRequest = useCallback((key: keyof Supplier | string, direction: 'asc' | 'desc' | null) => {
    setSortConfig(direction ? { key, direction } : null);
  }, []);

  const sortedSuppliers = useMemo(() => {
    let sortableItems = [...suppliers];
    if (sortConfig?.key) {
      sortableItems.sort((a, b) => {
        const valA = (a as any)[sortConfig.key!];
        const valB = (b as any)[sortConfig.key!];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [suppliers, sortConfig]);

  if (!hasPermission('manage_suppliers_page')) {
    return <AccessDeniedMessage />;
  }

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
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={() => {}} variant="outline" size="icon" disabled><Settings className="h-5 w-5" /></Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('Common.featureComingSoonTitle')}</p></TooltipContent>
                </Tooltip>
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={() => {}} variant="outline" size="icon" disabled><Upload className="h-5 w-5" /></Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('Common.featureComingSoonTitle')}</p></TooltipContent>
                </Tooltip>
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={() => {}} variant="outline" size="icon" disabled><Download className="h-5 w-5" /></Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('Common.featureComingSoonTitle')}</p></TooltipContent>
                </Tooltip>
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90" size="icon">
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
            <SupplierListTable
              suppliers={sortedSuppliers}
              displayColumns={columnDefinitions}
              columnDefinitions={columnDefinitions}
              onEditSupplier={handleEditSupplierTrigger}
              onDeleteSupplier={handleDeleteSupplierTrigger}
              onSort={handleSortRequest}
              currentSortKey={sortConfig?.key}
              currentSortDirection={sortConfig?.direction}
              groupingKeys={groupingKeys}
              onToggleGroup={() => {}}
            />
        </CardContent>
      </Card>

      <AddSupplierDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddSupplier={handleAddSupplier}
      />

      {editingSupplier && (
        <EditSupplierDialog
          open={isEditDialogOpen}
          onOpenChange={(isOpen) => {
            setIsEditDialogOpen(isOpen);
            if (!isOpen) {
              setEditingSupplier(null); 
            }
          }}
          supplier={editingSupplier}
          onSaveSupplier={handleSaveEditedSupplier}
        />
      )}

      {supplierToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('SuppliersManager.deleteDialogTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('SuppliersManager.deleteDialogDescription', {supplierName: supplierToDelete.name})}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteConfirmDialog(false)}>{t('SuppliersManager.deleteDialogCancel')}</AlertDialogCancel>
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
