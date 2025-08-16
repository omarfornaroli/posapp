
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SalesTable from '@/components/sales/SalesTable';
import GridSettingsDialog from '@/components/products/GridSettingsDialog';
import type { SaleTransaction, SortConfig, ColumnDefinition, PersistedColumnSetting, GridSetting, GroupedTableItem, GridTemplate, Currency } from '@/types';
import { FileText, Loader2, Settings, Download, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useDexieSales } from '@/hooks/useDexieSales';
import { useDexieClients } from '@/hooks/useDexieClients';
import { useDexiePaymentMethods } from '@/hooks/useDexiePaymentMethods';
import { useDexieCurrencies } from '@/hooks/useDexieCurrencies';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const PAGE_PATH = "/sales-report";

export default function SalesReportPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { sales, isLoading: isLoadingSales } = useDexieSales(); 
  const { clients, isLoading: isLoadingClients } = useDexieClients();
  const { paymentMethods, isLoading: isLoadingPaymentMethods } = useDexiePaymentMethods();
  const { currencies, isLoading: isLoadingCurrencies } = useDexieCurrencies();
  
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [selectedDispatchStatus, setSelectedDispatchStatus] = useState<string>('');
  
  const [isGridSettingsDialogOpen, setIsGridSettingsDialogOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig<SaleTransaction> | null>(null);
  const [groupingKeys, setGroupingKeys] = useState<string[]>([]);
  const [columnDefinitions, setColumnDefinitions] = useState<ColumnDefinition<SaleTransaction>[]>([]);
  const [persistedColumnSettings, setPersistedColumnSettings] = useState<PersistedColumnSetting[]>([]);

  const defaultCurrency = useMemo(() => currencies.find(c => c.isDefault), [currencies]);

  const getDefaultColumnDefinitions = useCallback((translateFn: typeof t): ColumnDefinition<SaleTransaction>[] => [
    { key: 'id', label: translateFn('SalesTable.headerTransactionId'), isSortable: true, isGroupable: false, className: "w-[120px]" },
    { key: 'date', label: translateFn('SalesTable.headerDate'), isSortable: true, isGroupable: true, className: "min-w-[180px]" },
    { key: 'clientName', label: translateFn('SalesTable.headerClient'), isSortable: true, isGroupable: true, className: "min-w-[150px]" },
    { key: 'items', label: translateFn('SalesTable.headerItems'), isSortable: true, isGroupable: false, className: "text-center" },
    { key: 'subtotal', label: translateFn('SalesTable.headerSubtotal'), isSortable: true, isGroupable: false, className: "text-right" },
    { key: 'taxAmount', label: translateFn('SalesTable.headerTax'), isSortable: true, isGroupable: false, className: "text-right" },
    { key: 'totalAmount', label: translateFn('SalesTable.headerTotalAmount'), isSortable: true, isGroupable: false, className: "text-right font-bold text-primary" },
    { key: 'appliedPayments', label: translateFn('SalesTable.headerPaymentMethod'), isSortable: false, isGroupable: true, className: "min-w-[150px]" },
    { key: 'currencyCode', label: translateFn('SalesTable.headerCurrency'), isSortable: true, isGroupable: true },
  ], []);

  useEffect(() => {
    if (!isLoadingTranslations) {
      const defaultCols = getDefaultColumnDefinitions(t);
      setColumnDefinitions(defaultCols);
      if (persistedColumnSettings.length === 0) {
        setPersistedColumnSettings(defaultCols.map(def => ({ key: String(def.key), visible: def.visible !== false })));
      }
    }
  }, [isLoadingTranslations, t, getDefaultColumnDefinitions, persistedColumnSettings.length]);

   const filteredTransactions = useMemo(() => {
    return sales.filter(transaction => {
      if (dateRange?.from && new Date(transaction.date) < dateRange.from) return false;
      if (dateRange?.to && new Date(transaction.date) > dateRange.to) return false;
      if (selectedClientId && transaction.clientId !== selectedClientId) return false;
      if (selectedPaymentMethodId && !transaction.appliedPayments.some(p => p.methodId === selectedPaymentMethodId)) return false;
      if (selectedDispatchStatus && transaction.dispatchStatus !== selectedDispatchStatus) return false;
      
      const lowercasedTerm = searchTerm.toLowerCase();
      if (lowercasedTerm && !(
          transaction.id.toLowerCase().includes(lowercasedTerm) ||
          transaction.clientName?.toLowerCase().includes(lowercasedTerm)
      )) {
        return false;
      }
      
      return true;
    });
  }, [sales, dateRange, searchTerm, selectedClientId, selectedPaymentMethodId, selectedDispatchStatus]);


  const handleExport = () => {
    toast({ title: t('Common.featureComingSoonTitle')});
  };

  const persistGridSettingsToApi = useCallback(async (settingsToPersist: GridSetting) => {
    // Implementation to save settings
  }, []);

  const handleSaveGridConfiguration = (
    newColumns: PersistedColumnSetting[],
    newSortConfig: SortConfig<SaleTransaction> | null,
    newGroupingKeys: string[]
  ) => {
    // Implementation to handle saving
  };

  const handleSortRequest = useCallback((key: keyof SaleTransaction | string, direction: 'asc' | 'desc' | null) => {
    // Implementation for sorting
  }, []);

  const handleToggleGroupingKey = useCallback((key: string) => {
    // Implementation for grouping
  }, []);
  
  if (!hasPermission('manage_sales_reports_page')) {
    return <AccessDeniedMessage />;
  }
  
  const isLoading = isLoadingTranslations || isLoadingSales || isLoadingClients || isLoadingPaymentMethods || isLoadingCurrencies;

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
                <FileText className="mr-3 h-8 w-8" /> {t('SalesReportPage.title')}
            </h1>
            <div className="flex gap-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <Button onClick={() => setIsGridSettingsDialogOpen(true)} variant="outline" size="icon" aria-label={t('ProductManagementPage.gridSettingsButton')}>
                                <Settings className="h-5 w-5" />
                            </Button>
                        </TooltipTrigger>
                         <TooltipContent><p>{t('ProductManagementPage.gridSettingsButton')}</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={handleExport} variant="outline" size="icon" aria-label={t('SalesReportPage.exportDataButton')}>
                                <Download className="h-5 w-5" />
                            </Button>
                        </TooltipTrigger>
                         <TooltipContent><p>{t('SalesReportPage.exportDataButton')}</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
      
        <Card className="shadow-xl">
            <CardContent className="pt-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <DateRangePicker date={dateRange} setDate={setDateRange} placeholder={t('SalesReportPage.pickDateRange')} />
                    <Input
                        type="search"
                        placeholder={t('SalesReportPage.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                     <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                        <SelectTrigger><SelectValue placeholder={t('SalesReportPage.filterByClient')} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">{t('SalesReportPage.allClients')}</SelectItem>
                            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={selectedDispatchStatus} onValueChange={setSelectedDispatchStatus}>
                        <SelectTrigger><SelectValue placeholder={t('SalesReportPage.filterByDispatchStatus')} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">{t('SalesReportPage.allStatuses')}</SelectItem>
                            <SelectItem value="Pending">{t('SalesReportPage.statusPending')}</SelectItem>
                            <SelectItem value="Partially Dispatched">{t('SalesReportPage.statusPartiallyDispatched')}</SelectItem>
                             <SelectItem value="Dispatched">{t('SalesReportPage.statusDispatched')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <SalesTable
                    transactions={filteredTransactions}
                    displayColumns={columnDefinitions.filter(c => c.visible !== false)}
                    columnDefinitions={columnDefinitions}
                    onSort={handleSortRequest}
                    currentSortKey={sortConfig?.key}
                    currentSortDirection={sortConfig?.direction}
                    groupingKeys={groupingKeys}
                    onToggleGroup={handleToggleGroupingKey}
                    defaultCurrency={defaultCurrency || null}
                 />
            </CardContent>
        </Card>
    </div>
  );
}

