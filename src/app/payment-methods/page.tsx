
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, CreditCard, Loader2, Settings, Upload, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { PaymentMethod, SortConfig } from '@/types';
import AddPaymentMethodDialog from '@/components/payment-methods/AddPaymentMethodDialog';
import EditPaymentMethodDialog from '@/components/payment-methods/EditPaymentMethodDialog';
import PaymentMethodListTable from '@/components/payment-methods/PaymentMethodListTable';
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
import { useDexiePaymentMethods } from '@/hooks/useDexiePaymentMethods';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function PaymentMethodsPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { paymentMethods, isLoading: isLoadingPaymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod } = useDexiePaymentMethods();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  
  const { toast } = useToast();

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<PaymentMethod | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig<PaymentMethod> | null>(null);

  const handleAddPaymentMethod = async (newMethodData: Omit<PaymentMethod, 'id'>) => {
    try {
      await addPaymentMethod(newMethodData);
      toast({
        title: t('Toasts.paymentMethodAddedTitle'),
        description: t('Toasts.paymentMethodAddedDescription', { methodName: newMethodData.name }),
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : 'Failed to add payment method',
      });
    }
  };

  const handleEditTrigger = (methodId: string) => {
    const methodToEdit = paymentMethods.find(p => p.id === methodId);
    if (methodToEdit) {
      setEditingMethod(methodToEdit);
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveEdited = async (updatedMethodData: PaymentMethod) => {
    try {
      await updatePaymentMethod(updatedMethodData);
      toast({
        title: t('Toasts.paymentMethodUpdatedTitle'),
        description: t('Toasts.paymentMethodUpdatedDescription', {methodName: updatedMethodData.name}),
      });
      setIsEditDialogOpen(false);
      setEditingMethod(null);
    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : 'Failed to update payment method.' });
    }
  };

  const handleDeleteTrigger = (methodId: string) => {
    const method = paymentMethods.find(p => p.id === methodId);
    if (method) {
      setMethodToDelete(method);
      setShowDeleteConfirmDialog(true);
    }
  };

  const confirmDelete = async () => {
    if (!methodToDelete) return;
    try {
      await deletePaymentMethod(methodToDelete.id);
      toast({
        title: t('Toasts.paymentMethodDeletedTitle'),
        description: t('Toasts.paymentMethodDeletedDescription', {methodName: methodToDelete.name}),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : 'Failed to delete payment method.',
      });
    } finally {
      setShowDeleteConfirmDialog(false);
      setMethodToDelete(null);
    }
  };
  
  const handleSortRequest = useCallback((key: keyof PaymentMethod | string, direction: 'asc' | 'desc' | null) => {
    setSortConfig(direction ? { key, direction } : null);
  }, []);

  const sortedMethods = useMemo(() => {
    let sortableItems = [...paymentMethods];
    if (sortConfig?.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key as keyof PaymentMethod];
        const valB = b[sortConfig.key as keyof PaymentMethod];
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'boolean' && typeof valB === 'boolean') {
             return sortConfig.direction === 'asc' ? (valA === valB ? 0 : valA ? -1 : 1) : (valA === valB ? 0 : valA ? 1 : -1);
        }
        return sortConfig.direction === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      });
    }
    return sortableItems;
  }, [paymentMethods, sortConfig]);

  if (!hasPermission('manage_payment_methods_page')) {
    return <AccessDeniedMessage />;
  }
  
  const isLoading = isLoadingTranslations || (isLoadingPaymentMethods && paymentMethods.length === 0);

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
            <CreditCard className="mr-3 h-8 w-8" /> {t('Header.paymentMethodsLink')}
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
                     <TooltipContent><p>{t('AddPaymentMethodDialog.title')}</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </div>
      
      <Card className="shadow-xl">
        <CardContent className="pt-6">
            <PaymentMethodListTable
              paymentMethods={sortedMethods}
              onEditPaymentMethod={handleEditTrigger}
              onDeletePaymentMethod={handleDeleteTrigger}
              onSort={handleSortRequest}
              onSetDefault={(id) => handleSaveEdited({ ...paymentMethods.find(m => m.id === id)!, isDefault: true })}
              onToggleEnable={(method, isEnabled) => handleSaveEdited({ ...method, isEnabled })}
              currentSortKey={sortConfig?.key}
              currentSortDirection={sortConfig?.direction}
            />
        </CardContent>
      </Card>

      <AddPaymentMethodDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddPaymentMethod={handleAddPaymentMethod}
      />

      {editingMethod && (
        <EditPaymentMethodDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          paymentMethod={editingMethod}
          onSavePaymentMethod={handleSaveEdited}
        />
      )}

      {methodToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('DeleteConfirmation.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('DeleteConfirmation.description', {itemName: methodToDelete.name, itemType: 'payment method'})}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowDeleteConfirmDialog(false)}>{t('DeleteConfirmation.cancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete} 
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
