
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DispatchListTable from '@/components/dispatches/DispatchListTable';
import DispatchDetailsDialog from '@/components/dispatches/DispatchDetailsDialog';
import type { SaleTransaction, DispatchStatus } from '@/types';
import { Truck, Loader2 } from 'lucide-react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useDexieSales } from '@/hooks/useDexieSales';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';

export default function DispatchesPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const { sales, isLoading: isLoadingSales, refetch: refetchSales } = useDexieSales();
  const [selectedSale, setSelectedSale] = useState<SaleTransaction | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DispatchStatus | 'All'>('Pending');

  const filteredSales = useMemo(() => {
    return sales
      .filter(sale => {
        if (statusFilter !== 'All' && sale.dispatchStatus !== statusFilter) {
          return false;
        }
        if (searchTerm) {
          const lowerTerm = searchTerm.toLowerCase();
          return (
            sale.id.toLowerCase().includes(lowerTerm) ||
            sale.clientName?.toLowerCase().includes(lowerTerm)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, statusFilter, searchTerm]);

  const handleViewDetails = (sale: SaleTransaction) => {
    setSelectedSale(sale);
    setIsDetailsOpen(true);
  };
  
  const handleDispatchSuccess = () => {
    refetchSales(); 
  };
  
  if (!hasPermission('manage_dispatches_page')) {
    return <AccessDeniedMessage />;
  }

  const isLoading = isLoadingTranslations || isLoadingSales;

  if (isLoading && sales.length === 0) {
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
          <Truck className="mr-3 h-8 w-8" /> {t('DispatchManager.title')}
        </h1>
      </div>

      <Card className="shadow-xl">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
             <Input
              type="search"
              placeholder={t('DispatchManager.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow"
            />
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={t('DispatchManager.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">{t('DispatchManager.tabAll')}</SelectItem>
                <SelectItem value="Pending">{t('DispatchManager.statusPending')}</SelectItem>
                <SelectItem value="Partially Dispatched">{t('DispatchManager.statusPartiallyDispatched')}</SelectItem>
                <SelectItem value="Dispatched">{t('DispatchManager.statusDispatched')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DispatchListTable
            sales={filteredSales}
            onViewDetails={handleViewDetails}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      <DispatchDetailsDialog
        sale={selectedSale}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onDispatchSuccess={handleDispatchSuccess}
      />
    </div>
  );
}
