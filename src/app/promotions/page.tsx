
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Loader2, Settings, Upload, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Promotion, SortConfig } from '@/types';
import AddPromotionDialog from '@/components/promotions/AddPromotionDialog';
import EditPromotionDialog from '@/components/promotions/EditPromotionDialog';
import PromotionListTable from '@/components/promotions/PromotionListTable';
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
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function PromotionsPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { promotions, isLoading: isLoadingPromotions, addPromotion, updatePromotion, deletePromotion } = useDexiePromotions();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  
  const { toast } = useToast();

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<Promotion | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig<Promotion> | null>(null);

  const handleAddPromotion = async (newPromotionData: Omit<Promotion, 'id'>) => {
    try {
      await addPromotion(newPromotionData);
      toast({
        title: t('Toasts.promotionAddedTitle'),
        description: t('Toasts.promotionAddedDescription', { promotionName: newPromotionData.name }),
      });
      setIsAddDialogOpen(false);
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
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveEditedPromotion = async (updatedPromotionData: Promotion) => {
    try {
      await updatePromotion(updatedPromotionData);
      toast({
        title: t('Toasts.promotionUpdatedTitle'),
        description: t('Toasts.promotionUpdatedDescription', {promotionName: updatedPromotionData.name}),
      });
      setIsEditDialogOpen(false);
      setEditingPromotion(null);
    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : 'Failed to update promotion.' });
    }
  };

  const handleDeletePromotionTrigger = (promotionId: string) => {
    const promotion = promotions.find(p => p.id === promotionId);
    if (promotion) {
      setPromotionToDelete(promotion);
      setShowDeleteConfirmDialog(true);
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
        description: error instanceof Error ? error.message : 'Failed to delete promotion.',
      });
    } finally {
      setShowDeleteConfirmDialog(false);
      setPromotionToDelete(null);
    }
  };

  const handleSortRequest = useCallback((key: keyof Promotion | string, direction: 'asc' | 'desc' | null) => {
    setSortConfig(direction ? { key, direction } : null);
  }, []);

  const sortedPromotions = useMemo(() => {
    let sortableItems = [...promotions];
    if (sortConfig?.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key as keyof Promotion];
        const valB = b[sortConfig.key as keyof Promotion];
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [promotions, sortConfig]);

  if (!hasPermission('manage_promotions_page')) {
    return <AccessDeniedMessage />;
  }

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
        <h1 className="text-3xl font-headline font-semibold text-primary">{t('Header.promotionsLink')}</h1>
        <div className="flex gap-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild><Button onClick={() => {}} variant="outline" size="icon" disabled><Settings className="h-5 w-5" /></Button></TooltipTrigger>
                    <TooltipContent><p>{t('Common.featureComingSoonTitle')}</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild><Button onClick={() => {}} variant="outline" size="icon" disabled><Upload className="h-5 w-5" /></Button></TooltipTrigger>
                    <TooltipContent><p>{t('Common.featureComingSoonTitle')}</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild><Button onClick={() => {}} variant="outline" size="icon" disabled><Download className="h-5 w-5" /></Button></TooltipTrigger>
                    <TooltipContent><p>{t('Common.featureComingSoonTitle')}</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90" size="icon">
                        <PlusCircle className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                     <TooltipContent><p>{t('AddPromotionDialog.title')}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </div>
      
      <Card className="shadow-xl">
        <CardContent className="pt-6">
            <PromotionListTable
              promotions={sortedPromotions}
              onEditPromotion={handleEditPromotionTrigger}
              onDeletePromotion={handleDeletePromotionTrigger}
              onSort={handleSortRequest}
              currentSortKey={sortConfig?.key}
              currentSortDirection={sortConfig?.direction}
            />
        </CardContent>
      </Card>

      <AddPromotionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddPromotion={handleAddPromotion}
      />

      {editingPromotion && (
        <EditPromotionDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          promotion={editingPromotion}
          onSavePromotion={handleSaveEditedPromotion}
        />
      )}

      {promotionToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('DeleteConfirmation.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('DeleteConfirmation.description', {itemName: promotionToDelete.name, itemType: 'promotion'})}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteConfirmDialog(false)}>{t('DeleteConfirmation.cancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeletePromotion} 
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
