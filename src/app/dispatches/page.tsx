
'use client';

import { useState, useEffect } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Card, CardContent } from '@/components/ui/card';
import { Truck, Loader2, ListFilter, Search } from 'lucide-react';
import { useRealtimeSales } from '@/hooks/useRealtimeSales';
import DispatchListTable from '@/components/dispatches/DispatchListTable';
import DispatchDetailsDialog from '@/components/dispatches/DispatchDetailsDialog';
import { SaleTransaction } from '@/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DispatchManagerPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  const { sales, isLoading: isLoadingSales, refetch } = useRealtimeSales();
  const [selectedSale, setSelectedSale] = useState<SaleTransaction | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const handleViewDetails = (sale: SaleTransaction) => {
    setSelectedSale(sale);
    setIsDetailsDialogOpen(true);
  };

  const handleDispatchSuccess = () => {
    refetch();
  };
  
  const filteredSales = sales.filter(sale => {
    const status = sale.dispatchStatus?.toLowerCase().replace(' ', '') || 'pending';
    const matchesTab = activeTab === 'all' || status === activeTab;
    if (!matchesTab) return false;
    
    if (!searchTerm) return true;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return (
      sale.id.toLowerCase().includes(lowerSearchTerm) ||
      sale.clientName?.toLowerCase().includes(lowerSearchTerm)
    );
  });


  if (!hasPermission('manage_dispatches_page')) {
    return <AccessDeniedMessage />;
  }

  if (isLoadingTranslations) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,64px)-4rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold text-primary flex items-center">
        <Truck className="mr-3 h-8 w-8" /> {t('DispatchManager.title')}
      </h1>
      
      <Card className="shadow-xl">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('DispatchManager.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            
            {/* Desktop Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden md:block">
              <TabsList>
                <TabsTrigger value="pending">{t('DispatchManager.tabPending')}</TabsTrigger>
                <TabsTrigger value="partiallydispatched">{t('DispatchManager.tabPartiallyDispatched')}</TabsTrigger>
                <TabsTrigger value="dispatched">{t('DispatchManager.tabDispatched')}</TabsTrigger>
                <TabsTrigger value="all">{t('DispatchManager.tabAll')}</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Mobile Dropdown */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <ListFilter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t('DispatchManager.filterByStatus')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={activeTab} onValueChange={setActiveTab}>
                    <DropdownMenuRadioItem value="pending">{t('DispatchManager.tabPending')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="partiallydispatched">{t('DispatchManager.tabPartiallyDispatched')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dispatched">{t('DispatchManager.tabDispatched')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="all">{t('DispatchManager.tabAll')}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <DispatchListTable
            sales={filteredSales}
            onViewDetails={handleViewDetails}
            isLoading={isLoadingSales}
          />
        </CardContent>
      </Card>
      
      <DispatchDetailsDialog 
        sale={selectedSale}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        onDispatchSuccess={handleDispatchSuccess}
      />
    </div>
  );
}
