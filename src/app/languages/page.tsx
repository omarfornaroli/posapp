
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Languages, Loader2, AlertTriangle, CloudCog } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AppLanguage, SortConfig } from '@/types';
import AddAppLanguageDialog from '@/components/languages/AddAppLanguageDialog';
import EditAppLanguageDialog from '@/components/languages/EditAppLanguageDialog';
import AppLanguageListTable from '@/components/languages/AppLanguageListTable';
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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { useDexieAppLanguages } from '@/hooks/useDexieAppLanguages';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MessageFile {
  name: string;
  path: string;
}

export default function LanguagesManagerPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { appLanguages, isLoading: isLoadingData, addLanguage, updateLanguage, deleteLanguage, refetch } = useDexieAppLanguages();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<AppLanguage | null>(null);
  
  const { toast } = useToast();

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [languageToDelete, setLanguageToDelete] = useState<AppLanguage | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig<AppLanguage> | null>({ key: 'name', direction: 'asc' });
  const [isApplyingConfig, setIsApplyingConfig] = useState(false);

  const handleAddLanguage = async (newLangData: Omit<AppLanguage, 'id'>) => {
    try {
      await addLanguage(newLangData);
      toast({
        title: t('Toasts.languageAddedTitle'),
        description: t('Toasts.languageAddedDescription', { langName: newLangData.name }),
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : 'Failed to add language',
      });
    }
  };

  const handleEditTrigger = (lang: AppLanguage) => {
    setEditingLanguage(lang);
    setIsEditDialogOpen(true);
  };
  
  const handleSaveEdited = async (updatedLangData: AppLanguage) => {
    try {
      await updateLanguage(updatedLangData);
      const isDefaultUpdate = updatedLangData.isDefault;
      toast({
        title: isDefaultUpdate ? t('Toasts.languageDefaultSetTitle') : t('Toasts.languageUpdatedTitle'),
        description: isDefaultUpdate ? t('Toasts.languageDefaultSetDescription', {langName: updatedLangData.name}) : t('Toasts.languageUpdatedDescription', {langName: updatedLangData.name}),
      });
      setIsEditDialogOpen(false);
      setEditingLanguage(null);
    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : 'Failed to update language.' });
    }
  };
  
  const handleToggleEnable = async (lang: AppLanguage, isEnabled: boolean) => {
    try {
      await updateLanguage({ ...lang, isEnabled });
      toast({
          title: t('Toasts.languageStatusUpdatedTitle'),
          description: t('Toasts.languageStatusUpdatedDescription', { langName: lang.name, status: isEnabled ? t('Common.enabled') : t('Common.disabled') }),
      });
    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : 'Failed to update language status.' });
    }
  };
  
  const handleSetDefault = async (langId: string) => {
     try {
       const langToUpdate = appLanguages.find(l => l.id === langId);
       if (!langToUpdate) return;
       await updateLanguage({ ...langToUpdate, isDefault: true });
       toast({
          title: t('Toasts.languageDefaultSetTitle'),
          description: t('Toasts.languageDefaultSetDescription', { langName: langToUpdate.name }),
       });
    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : 'Failed to set default language.' });
    }
  };

  const handleDeleteTrigger = (lang: AppLanguage) => {
    setLanguageToDelete(lang);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDelete = async () => {
    if (!languageToDelete) return;
    try {
      await deleteLanguage(languageToDelete.id);
      toast({
        title: t('Toasts.languageDeletedTitle'),
        description: t('Toasts.languageDeletedDescription', {langName: languageToDelete.name}),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : 'Failed to delete language.',
      });
    } finally {
      setShowDeleteConfirmDialog(false);
      setLanguageToDelete(null);
    }
  };
  
  const handleApplyConfiguration = async () => {
    setIsApplyingConfig(true);
    try {
        const response = await fetch('/api/languages/apply-configuration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        toast({ title: t('Toasts.configAppliedTitle'), description: t('Toasts.configAppliedDescription'), duration: 8000 });
    } catch(e) {
        toast({ variant: 'destructive', title: t('Common.error'), description: e instanceof Error ? e.message : 'Failed to apply configuration' });
    } finally {
        setIsApplyingConfig(false);
    }
  };
  
  const handleSortRequest = useCallback((key: keyof AppLanguage | string, direction: 'asc' | 'desc' | null) => {
    setSortConfig(direction ? { key, direction } : null);
  }, []);

  const sortedLanguages = useMemo(() => {
    let sortableItems = [...appLanguages];
    if (sortConfig?.key) {
      sortableItems.sort((a, b) => {
        const valA = (a as any)[sortConfig.key!];
        const valB = (b as any)[sortConfig.key!];
        if (typeof valA === 'boolean' && typeof valB === 'boolean') {
             return sortConfig.direction === 'asc' ? (valA === valB ? 0 : valA ? -1 : 1) : (valA === valB ? 0 : valA ? 1 : -1);
        }
        return sortConfig.direction === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      });
    }
    return sortableItems;
  }, [appLanguages, sortConfig]);

  if (!hasPermission('manage_languages_page')) {
    return <AccessDeniedMessage />;
  }
  
  const isLoading = isLoadingTranslations || (isLoadingData && appLanguages.length === 0);

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
            <Languages className="mr-3 h-8 w-8" /> {t('LanguagesManagerPage.title')}
        </h1>
        <div className="flex gap-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleApplyConfiguration} disabled={isApplyingConfig} variant="destructive">
                        {isApplyingConfig ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CloudCog className="mr-2 h-5 w-5" />}
                        {t('LanguagesManagerPage.applyAndRestartButton')}
                      </Button>
                    </TooltipTrigger>
                     <TooltipContent><p>{t('LanguagesManagerPage.applyAndRestartTooltip')}</p></TooltipContent>
                </Tooltip>
                 <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90">
                        <PlusCircle className="mr-2 h-5 w-5" />
                        {t('LanguagesManagerPage.addNewLanguageButton')}
                      </Button>
                    </TooltipTrigger>
                     <TooltipContent><p>{t('LanguagesManagerPage.addNewLanguageTooltip')}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </div>
      
       <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('LanguagesManagerPage.warningTitle')}</AlertTitle>
            <AlertDescription>{t('LanguagesManagerPage.warningDescription')}</AlertDescription>
        </Alert>

      <Card className="shadow-xl">
        <CardContent className="pt-6">
            <AppLanguageListTable
              languages={sortedLanguages}
              onEditLanguage={handleEditTrigger}
              onDeleteLanguage={handleDeleteTrigger}
              onToggleEnable={handleToggleEnable}
              onSetDefault={handleSetDefault}
              onSort={handleSortRequest}
              currentSortKey={sortConfig?.key}
              currentSortDirection={sortConfig?.direction}
            />
        </CardContent>
      </Card>

      <AddAppLanguageDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddLanguage={handleAddLanguage}
        existingCodes={appLanguages.map(l => l.code)}
      />

      {editingLanguage && (
        <EditAppLanguageDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          language={editingLanguage}
          onSaveLanguage={handleSaveEdited}
        />
      )}

      {languageToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('LanguagesManagerPage.deleteDialogTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('LanguagesManagerPage.deleteDialogDescription', {langName: languageToDelete.name})}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteConfirmDialog(false)}>{t('LanguagesManagerPage.deleteDialogCancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete} 
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

