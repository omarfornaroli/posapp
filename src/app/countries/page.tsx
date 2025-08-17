
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, MapIcon, Loader2, Settings, Upload, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Country, SortConfig } from '@/types';
import AddCountryDialog from '@/components/countries/AddCountryDialog';
import EditCountryDialog from '@/components/countries/EditCountryDialog';
import CountryListTable from '@/components/countries/CountryListTable';
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
import { useDexieCountries } from '@/hooks/useDexieCountries';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function CountriesPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { countries, isLoading: isLoadingData, addCountry, updateCountry, deleteCountry } = useDexieCountries();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  
  const { toast } = useToast();

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [countryToDelete, setCountryToDelete] = useState<Country | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig<Country> | null>({ key: 'name', direction: 'asc' });

  const handleAddCountry = async (newCountryData: Omit<Country, 'id'>) => {
    try {
      await addCountry(newCountryData);
      toast({
        title: t('Toasts.countryAddedTitle'),
        description: t('Toasts.countryAddedDescription', { countryName: newCountryData.name }),
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

  const handleEditTrigger = (country: Country) => {
    setEditingCountry(country);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdited = async (updatedCountryData: Country) => {
    try {
      await updateCountry(updatedCountryData);
      toast({
        title: updatedCountryData.isDefault ? t('Toasts.countryDefaultSetTitle') : t('Toasts.countryUpdatedTitle'),
        description: updatedCountryData.isDefault ? t('Toasts.countryDefaultSetDescription', {countryName: updatedCountryData.name}) : t('Toasts.countryUpdatedDescription', {countryName: updatedCountryData.name}),
      });
      setIsEditDialogOpen(false);
      setEditingCountry(null);
    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('CountryManagerPage.errorUpdatingCountry') });
    }
  };
  
  const handleToggleEnable = async (country: Country, isEnabled: boolean) => {
    try {
      await updateCountry({ ...country, isEnabled });
      toast({
          title: t('Toasts.countryStatusUpdatedTitle'),
          description: t('Toasts.countryStatusUpdatedDescription', { countryName: country.name, status: isEnabled ? t('Common.enabled') : t('Common.disabled') }),
      });
    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('CountryManagerPage.errorUpdatingStatus') });
    }
  };
  
  const handleSetDefault = async (countryId: string) => {
     try {
       const countryToUpdate = countries.find(c => c.id === countryId);
       if (!countryToUpdate) return;
       await updateCountry({ ...countryToUpdate, isDefault: true });
       toast({
          title: t('Toasts.countryDefaultSetTitle'),
          description: t('Toasts.countryDefaultSetDescription', { countryName: countryToUpdate.name }),
       });
    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('CountryManagerPage.errorSettingDefault') });
    }
  };

  const handleDeleteTrigger = (country: Country) => {
    setCountryToDelete(country);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDelete = async () => {
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
  
  const handleSortRequest = useCallback((key: keyof Country | string, direction: 'asc' | 'desc' | null) => {
    setSortConfig(direction ? { key, direction } : null);
  }, []);

  const sortedCountries = useMemo(() => {
    let sortableItems = [...countries];
    if (sortConfig?.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key as keyof Country];
        const valB = b[sortConfig.key as keyof Country];
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'boolean' && typeof valB === 'boolean') {
             return sortConfig.direction === 'asc' ? (valA === valB ? 0 : valA ? -1 : 1) : (valA === valB ? 0 : valA ? 1 : -1);
        }
        return sortConfig.direction === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      });
    }
    return sortableItems;
  }, [countries, sortConfig]);

  if (!hasPermission('manage_countries_page')) {
    return <AccessDeniedMessage />;
  }
  
  const isLoading = isLoadingTranslations || (isLoadingData && countries.length === 0);

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
            <MapIcon className="mr-3 h-8 w-8" /> {t('CountryManagerPage.title')}
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
                     <TooltipContent><p>{t('CountryManagerPage.addNewCountryButton')}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </div>
      
      <Card className="shadow-xl">
        <CardContent className="pt-6">
            <CountryListTable
              countries={sortedCountries}
              onEditCountry={handleEditTrigger}
              onDeleteCountry={handleDeleteTrigger}
              onToggleEnable={handleToggleEnable}
              onSetDefault={handleSetDefault}
              onSort={handleSortRequest}
              currentSortKey={sortConfig?.key}
              currentSortDirection={sortConfig?.direction}
            />
        </CardContent>
      </Card>

      <AddCountryDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddCountry={handleAddCountry}
        existingCodes={countries.map(c => c.codeAlpha2)}
      />

      {editingCountry && (
        <EditCountryDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          country={editingCountry}
          onSaveCountry={handleSaveEdited}
          existingCodes={countries.map(c => c.codeAlpha2)}
        />
      )}

      {countryToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('CountryManagerPage.deleteDialogTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('CountryManagerPage.deleteDialogDescription', {countryName: countryToDelete.name})}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteConfirmDialog(false)}>{t('CountryManagerPage.deleteDialogCancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete} 
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
