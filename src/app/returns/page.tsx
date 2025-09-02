
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { SaleTransaction, Return as ReturnType, ReturnItem } from '@/types';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Undo, Search, Loader2, MinusCircle, PlusCircle, AlertTriangle } from 'lucide-react';
import { useDexieSales } from '@/hooks/useDexieSales';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';

const generateId = () => `temp-return-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export default function ReturnsPage() {
  const { t } = useRxTranslate();
  const { hasPermission, user } = useAuth();
  const { toast } = useToast();
  const { sales, isLoading: isLoadingSales } = useDexieSales();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<SaleTransaction | null>(null);
  const [returnItems, setReturnItems] = useState<Map<string, number>>(new Map());
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return sales
      .filter(s => s.id.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 5);
  }, [sales, searchTerm]);

  const handleSelectSale = (sale: SaleTransaction) => {
    setSelectedSale(sale);
    setSearchTerm('');
    setReturnItems(new Map());
  };

  const updateReturnQuantity = (productId: string, quantity: number) => {
    setReturnItems(prev => {
      const newMap = new Map(prev);
      if (quantity > 0) {
        newMap.set(productId, quantity);
      } else {
        newMap.delete(productId);
      }
      return newMap;
    });
  };
  
  const totalRefundAmount = useMemo(() => {
    if (!selectedSale) return 0;
    let total = 0;
    returnItems.forEach((quantity, productId) => {
      const saleItem = selectedSale.items.find(i => i.productId === productId);
      if (saleItem) {
        total += saleItem.price * quantity;
      }
    });
    return total;
  }, [selectedSale, returnItems]);
  
  const handleProcessReturn = async () => {
    if (!selectedSale || returnItems.size === 0) {
      toast({ variant: 'destructive', title: t('Common.error'), description: t('ReturnsPage.errorNoItems') });
      return;
    }
    setIsProcessing(true);

    const itemsToReturn: ReturnItem[] = Array.from(returnItems.entries()).map(([productId, quantity]) => {
      const saleItem = selectedSale.items.find(i => i.productId === productId)!;
      return {
        productId: saleItem.productId,
        name: saleItem.name,
        price: saleItem.price,
        quantity: quantity,
        isService: saleItem.isService,
        barcode: saleItem.barcode,
        category: saleItem.category,
      };
    });

    const newReturn: Omit<ReturnType, 'id'> = {
      originalSaleId: selectedSale.id,
      returnDate: new Date().toISOString(),
      items: itemsToReturn,
      totalRefundAmount: totalRefundAmount,
      reason,
      notes,
      createdBy: user?.id,
    };
    
    try {
        await db.returns.add({ ...newReturn, id: generateId() });
        await syncService.addToQueue({ entity: 'return', operation: 'create', data: newReturn });

        for(const item of itemsToReturn) {
            if(!item.isService) {
              const product = await db.products.get(item.productId);
              if (product) {
                const updatedProduct = { ...product, quantity: product.quantity + item.quantity };
                await db.products.put(updatedProduct);
                await syncService.addToQueue({ entity: 'product', operation: 'update', data: updatedProduct });
              }
            }
        }
        
        toast({ title: t('ReturnsPage.returnSuccessTitle'), description: t('ReturnsPage.returnSuccessDescription', { amount: totalRefundAmount.toFixed(2) }) });
        setSelectedSale(null);
        setReturnItems(new Map());
        setReason('');
        setNotes('');

    } catch (error) {
       toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : t('ReturnsPage.errorProcessing') });
    } finally {
        setIsProcessing(false);
    }
  };

  if (!hasPermission('manage_returns_page')) return <AccessDeniedMessage />;
  
  if (isLoadingSales) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-semibold text-primary flex items-center">
          <Undo className="mr-3 h-8 w-8" /> {t('Header.returnsLink')}
        </h1>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{t('ReturnsPage.findSaleTitle')}</CardTitle>
          <CardDescription>{t('ReturnsPage.findSaleDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('ReturnsPage.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-1 w-full bg-card border shadow-lg rounded-md z-10">
                {searchResults.map(sale => (
                  <div key={sale.id} onClick={() => handleSelectSale(sale)} className="p-2 hover:bg-muted cursor-pointer text-sm">
                    {sale.id} ({sale.clientName || 'Walk-in'})
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {selectedSale && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{t('ReturnsPage.returnItemsTitle')}</CardTitle>
            <CardDescription>{t('ReturnsPage.returnItemsDescription', { saleId: selectedSale.id })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border max-h-60 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Dashboard.productName')}</TableHead>
                    <TableHead className="text-center">{t('ReturnsPage.quantityPurchased')}</TableHead>
                    <TableHead className="w-[150px] text-center">{t('ReturnsPage.quantityToReturn')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedSale.items.map(item => (
                    <TableRow key={item.productId}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                           <Input 
                             type="number" 
                             min="0" 
                             max={item.quantity} 
                             value={returnItems.get(item.productId) || '0'}
                             onChange={(e) => updateReturnQuantity(item.productId, parseInt(e.target.value, 10))}
                             className="w-20 text-center h-8"
                           />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="return-reason">{t('ReturnsPage.reasonLabel')}</Label>
                <Input id="return-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder={t('ReturnsPage.reasonPlaceholder')} />
              </div>
               <div className="space-y-1">
                <Label htmlFor="return-notes">{t('ReturnsPage.notesLabel')}</Label>
                <Textarea id="return-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('ReturnsPage.notesPlaceholder')} />
              </div>
            </div>
             <div className="flex justify-end items-center gap-4 pt-4 border-t">
              <div className="font-semibold text-lg">{t('ReturnsPage.totalRefundLabel')}: <span className="text-primary">{selectedSale.currencySymbol}{totalRefundAmount.toFixed(2)}</span></div>
              <Button onClick={handleProcessReturn} disabled={isProcessing || returnItems.size === 0}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Undo className="mr-2 h-4 w-4"/>}
                {t('ReturnsPage.processReturnButton')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
