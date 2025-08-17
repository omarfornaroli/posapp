
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function TaxesPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { taxes, isLoading: isLoadingTaxes, addTax, updateTax, deleteTax } = useDexieTaxes();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  
  const { toast } = useToast();

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [taxToDelete, setTaxToDelete] = useState<Tax | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig<Tax> | null>(null);

  const handleAddTax = async (newTaxData: Omit<Tax, 'id'>) => {
    try {
      await addTax(newTaxData);
      toast({
        title: t('Toasts.taxAddedTitle', { taxName: newTaxData.name }),
      });
      setIsAddDialogOpen(false);
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
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveEditedTax = async (updatedTaxData: Tax) => {
    try {
      await updateTax(updatedTaxData);
      toast({
        title: t('Toasts.taxUpdatedTitle'),
        description: t('Toasts.taxUpdatedDescription', {taxName: updatedTaxData.name}),
      });
      setIsEditDialogOpen(false);
      setEditingTax(null);
    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : 'Failed to update tax.' });
    }
  };

  const handleDeleteTaxTrigger = (taxId: string) => {
    const tax = taxes.find(p => p.id === taxId);
    if (tax) {
      setTaxToDelete(tax);
      setShowDeleteConfirmDialog(true);
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
        description: error instanceof Error ? error.message : 'Failed to delete tax.',
      });
    } finally {
      setShowDeleteConfirmDialog(false);
      setTaxToDelete(null);
    }
  };

  const handleSortRequest = useCallback((key: keyof Tax | string, direction: 'asc' | 'desc' | null) => {
    setSortConfig(direction ? { key, direction } : null);
  }, []);

  const sortedTaxes = useMemo(() => {
    let sortableItems = [...taxes];
    if (sortConfig?.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key as keyof Tax];
        const valB = b[sortConfig.key as keyof Tax];
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        return sortConfig.direction === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      });
    }
    return sortableItems;
  }, [taxes, sortConfig]);

  if (!hasPermission('manage_taxes_page')) {
    return <AccessDeniedMessage />;
  }

  if (isLoadingTranslations || (isLoadingTaxes && taxes.length === 0)) {
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
            <Percent className="mr-3 h-8 w-8" /> {t('Header.taxManagerLink')}
        </h1>
        <div className="flex gap-2">
            <TooltipProvider>
                <Tooltip><TooltipTrigger asChild><Button onClick={() => {}} variant="outline" size="icon" disabled><Settings className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Common.featureComingSoonTitle')}</p></TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button onClick={() => {}} variant="outline" size="icon" disabled><Upload className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Common.featureComingSoonTitle')}</p></TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button onClick={() => {}} variant="outline" size="icon" disabled><Download className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Common.featureComingSoonTitle')}</p></TooltipContent></Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90" size="icon">
                        <PlusCircle className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                     <TooltipContent><p>{t('AddTaxDialog.title')}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </div>
      
      <Card className="shadow-xl">
        <CardContent className="pt-6">
            <TaxListTable
              taxes={sortedTaxes}
              onEditTax={handleEditTaxTrigger}
              onDeleteTax={handleDeleteTaxTrigger}
              onSort={handleSortRequest}
              currentSortKey={sortConfig?.key}
              currentSortDirection={sortConfig?.direction}
            />
        </CardContent>
      </Card>

      <AddTaxDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddTax={handleAddTax}
      />

      {editingTax && (
        <EditTaxDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          tax={editingTax}
          onSaveTax={handleSaveEditedTax}
        />
      )}

      {taxToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('DeleteConfirmation.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('DeleteConfirmation.description', {itemName: taxToDelete.name, itemType: 'tax'})}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteConfirmDialog(false)}>{t('DeleteConfirmation.cancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteTax} 
                className={buttonVariants({ variant: "destructive" })}
              >
                {t('DeleteConfirmation.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
