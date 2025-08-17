
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Landmark, Loader2, Settings, Upload, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Currency, SortConfig } from '@/types';
import AddCurrencyDialog from '@/components/currencies/AddCurrencyDialog';
import EditCurrencyDialog from '@/components/currencies/EditCurrencyDialog';
import CurrencyListTable from '@/components/currencies/CurrencyListTable';
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
import { useDexieCurrencies } from '@/hooks/useDexieCurrencies';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function CurrenciesPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { currencies, isLoading: isLoadingData, addCurrency, updateCurrency, deleteCurrency } = useDexieCurrencies();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  
  const { toast } = useToast();

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [currencyToDelete, setCurrencyToDelete] = useState<Currency | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig<Currency> | null>({ key: 'name', direction: 'asc' });

  const handleAddCurrency = async (newCurrencyData: Omit<Currency, 'id'>) => {
    try {
      await addCurrency(newCurrencyData);
      toast({
        title: t('Toasts.currencyAddedTitle'),
        description: t('Toasts.currencyAddedDescription', { currencyName: newCurrencyData.name }),
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

  const handleEditTrigger = (currency: Currency) => {
    setEditingCurrency(currency);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdited = async (updatedCurrencyData: Currency) => {
    try {
      await updateCurrency(updatedCurrencyData);
      toast({
        title: updatedCurrencyData.isDefault ? t('Toasts.currencyDefaultSetTitle') : t('Toasts.currencyUpdatedTitle'),
        description: updatedCurrencyData.isDefault ? t('Toasts.currencyDefaultSetDescription', {currencyName: updatedCurrencyData.name}) : t('Toasts.currencyUpdatedDescription', {currencyName: updatedCurrencyData.name}),
      });
      setIsEditDialogOpen(false);
      setEditingCurrency(null);
    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('CurrencyManager.errorUpdatingCurrency') });
    }
  };
  
  const handleToggleEnable = async (currency: Currency, isEnabled: boolean) => {
    try {
      await updateCurrency({ ...currency, isEnabled });
      toast({
          title: t('Toasts.currencyStatusUpdatedTitle'),
          description: t('Toasts.currencyStatusUpdatedDescription', { currencyName: currency.name, currencyCode: currency.code, status: isEnabled ? t('Common.enabled') : t('Common.disabled') }),
      });
    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('CurrencyManager.errorUpdatingStatus') });
    }
  };
  
  const handleSetDefault = async (currencyId: string) => {
     try {
       const currencyToUpdate = currencies.find(c => c.id === currencyId);
       if (!currencyToUpdate) return;
       await updateCurrency({ ...currencyToUpdate, isDefault: true });
       toast({
          title: t('Toasts.currencyDefaultSetTitle'),
          description: t('Toasts.currencyDefaultSetDescription', { currencyName: currencyToUpdate.name }),
       });
    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('CurrencyManager.errorSettingDefault') });
    }
  };

  const handleDeleteTrigger = (currency: Currency) => {
    setCurrencyToDelete(currency);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDelete = async () => {
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
  
  const handleSortRequest = useCallback((key: keyof Currency | string, direction: 'asc' | 'desc' | null) => {
    setSortConfig(direction ? { key, direction } : null);
  }, []);

  const sortedCurrencies = useMemo(() => {
    let sortableItems = [...currencies];
    if (sortConfig?.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key as keyof Currency];
        const valB = b[sortConfig.key as keyof Currency];
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
         if (typeof valA === 'boolean' && typeof valB === 'boolean') {
             return sortConfig.direction === 'asc' ? (valA === valB ? 0 : valA ? -1 : 1) : (valA === valB ? 0 : valA ? 1 : -1);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        return sortConfig.direction === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      });
    }
    return sortableItems;
  }, [currencies, sortConfig]);

  if (!hasPermission('manage_currencies_page')) {
    return <AccessDeniedMessage />;
  }
  
  const isLoading = isLoadingTranslations || (isLoadingData && currencies.length === 0);

  if (isLoading) {
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
                     <TooltipContent><p>{t('CurrencyManager.addNewCurrencyButton')}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </div>
      
      <Card className="shadow-xl">
        <CardContent className="pt-6">
            <CurrencyListTable
              currencies={sortedCurrencies}
              onEditCurrency={handleEditTrigger}
              onDeleteCurrency={handleDeleteTrigger}
              onToggleEnable={handleToggleEnable}
              onSetDefault={handleSetDefault}
              onSort={handleSortRequest}
              currentSortKey={sortConfig?.key}
              currentSortDirection={sortConfig?.direction}
            />
        </CardContent>
      </Card>

      <AddCurrencyDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddCurrency={handleAddCurrency}
        existingCodes={currencies.map(c => c.code)}
      />

      {editingCurrency && (
        <EditCurrencyDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          currency={editingCurrency}
          onSaveCurrency={handleSaveEdited}
          existingCodes={currencies.map(c => c.code)}
        />
      )}

      {currencyToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('CurrencyManager.deleteDialogTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('CurrencyManager.deleteDialogDescription', {currencyName: currencyToDelete.name, currencyCode: currencyToDelete.code})}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteConfirmDialog(false)}>{t('CurrencyManager.deleteDialogCancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete} 
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
