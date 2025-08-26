

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Truck, PackageCheck, Loader2, AlertTriangle, Package, Check, ClipboardList, MinusCircle, PlusCircle } from 'lucide-react';
import type { SaleTransaction } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';

interface DispatchDetailsDialogProps {
  sale: SaleTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDispatchSuccess: () => void;
}

export default function DispatchDetailsDialog({ sale, open, onOpenChange, onDispatchSuccess }: DispatchDetailsDialogProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const [isDispatching, setIsDispatching] = useState(false);
  const { toast } = useToast();
  const [dispatchQuantities, setDispatchQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  useEffect(() => {
    if (!open) {
      setDispatchQuantities({});
      setIsDispatching(false);
    }
  }, [open]);

  const handleQuantityChange = (productId: string, value: string, max: number) => {
    const quantity = parseInt(value, 10);
    if (value === '') {
      setDispatchQuantities(prev => ({ ...prev, [productId]: 0 }));
      return;
    }
    if (!isNaN(quantity) && quantity >= 0 && quantity <= max) {
      setDispatchQuantities(prev => ({ ...prev, [productId]: quantity }));
    }
  };
  
  const handleConfirmDispatch = async () => {
    if (!sale) return;

    const itemsToDispatch = Object.entries(dispatchQuantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    if (itemsToDispatch.length === 0) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: t('DispatchManager.dispatchFailedNoItems'),
      });
      return;
    }
    
    setIsDispatching(true);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      const userEmail = typeof window !== 'undefined' ? localStorage.getItem('loggedInUserEmail') : null;
      if (userEmail) headers['X-User-Email'] = userEmail;

      const response = await fetch(`/api/sales/${sale.id}/dispatch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ itemsToDispatch }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || t('DispatchManager.dispatchFailedError'));
      }
      
      const newStatus = result.data.dispatchStatus;
      let toastDescription = '';
      if (newStatus === 'Dispatched') {
        toastDescription = t('DispatchManager.dispatchSuccessFull', { saleId: sale.id });
      } else {
        toastDescription = t('DispatchManager.dispatchSuccessPartial', { saleId: sale.id });
      }
      
      toast({ title: t('DispatchManager.dispatchSuccessTitle'), description: toastDescription });
      onDispatchSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('DispatchManager.dispatchFailedError') });
    } finally {
      setIsDispatching(false);
    }
  };
  
  if (isLoadingTranslations && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl flex items-center justify-center h-96">
           <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </DialogContent>
      </Dialog>
    );
  }

  if (!sale) return null;
  
  const isFullyDispatched = sale.dispatchStatus === 'Dispatched';
  const totalItemsToDispatch = Object.values(dispatchQuantities).reduce((sum, qty) => sum + qty, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-headline">{t('DispatchManager.dialogTitle', { saleId: `...${sale.id.slice(-8)}` })}</DialogTitle>
          <DialogDescription>{t('DispatchManager.dialogDescription')}</DialogDescription>
        </DialogHeader>
        <div className="flex-grow py-2 overflow-hidden">
          {isFullyDispatched ? (
             <Alert variant="default" className="bg-green-50 border-green-200">
                <PackageCheck className="h-4 w-4 !text-green-600" />
                <AlertTitle className="text-green-800">{t('DispatchManager.alreadyDispatchedTitle')}</AlertTitle>
                <AlertDescription className="text-green-700">
                  {t('DispatchManager.alreadyDispatchedDescription')}
                </AlertDescription>
            </Alert>
          ) : (
            <h3 className="font-semibold mb-2">{t('DispatchManager.dialogItemsHeader')}</h3>
          )}
          <ScrollArea className="h-full border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('DispatchManager.dialogTableHeaderProduct')}</TableHead>
                  <TableHead className="text-center">{t('DispatchManager.dialogTableHeaderOrdered')}</TableHead>
                  <TableHead className="text-center">{t('DispatchManager.dialogTableHeaderDispatched')}</TableHead>
                  <TableHead className="text-center">{t('DispatchManager.dialogTableHeaderRemaining')}</TableHead>
                  {!isFullyDispatched && (
                    <TableHead className="text-center w-[150px]">{t('DispatchManager.dialogTableHeaderToDispatch')}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item, index) => {
                  const dispatchedQty = item.dispatchedQuantity || 0;
                  const remainingQty = item.quantity - dispatchedQty;
                  return (
                    <TableRow key={item.productId ? `${item.productId}-${index}` : index}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-center font-mono">{item.quantity}</TableCell>
                      <TableCell className="text-center font-mono text-green-600">{dispatchedQty}</TableCell>
                      <TableCell className="text-center font-mono font-bold">{remainingQty}</TableCell>
                      {!isFullyDispatched && (
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min="0"
                            max={remainingQty}
                            value={dispatchQuantities[item.productId] || ''}
                            onChange={(e) => handleQuantityChange(item.productId, e.target.value, remainingQty)}
                            placeholder="0"
                            className="h-8 text-center"
                            disabled={remainingQty === 0 || isDispatching}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {sale.items.every(item => (item.quantity - (item.dispatchedQuantity || 0)) === 0) && !isFullyDispatched && (
                 <p className="text-center text-muted-foreground p-4 text-sm">{t('DispatchManager.noItemsToDispatch')}</p>
            )}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

        </div>
        <DialogFooter className="shrink-0 pt-4 border-t">
          <DialogClose asChild><Button variant="outline">{t('Common.close')}</Button></DialogClose>
          {!isFullyDispatched && (
            <Button onClick={handleConfirmDispatch} disabled={isDispatching || totalItemsToDispatch === 0}>
              {isDispatching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
              {t('DispatchManager.dispatchItemsButton')} ({totalItemsToDispatch})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
