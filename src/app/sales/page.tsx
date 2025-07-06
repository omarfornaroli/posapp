'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import SalesTable from '@/components/sales/SalesTable';
import type { SaleTransaction, SortConfig, ColumnDefinition, PersistedColumnSetting, GridSetting, GroupedTableItem, Client, PaymentMethod, DispatchStatus, Currency } from '@/types';
import { Calendar as CalendarIcon, Download, Filter, Loader2, Settings, Upload, Search, ListFilter } from 'lucide-react';
import { format, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useToast } from '@/hooks/use-toast';
import { useDexieSales } from '@/hooks/useDexieSales'; 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import GridSettingsDialog from '@/components/products/GridSettingsDialog';
import { useDexieCurrencies } from '@/hooks/useDexieCurrencies';
import { useDexieClients } from '@/hooks/useDexieClients';
import { useDexiePaymentMethods } from '@/hooks/useDexiePaymentMethods';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const PAGE_PATH = "/sales";

export default function SalesReportPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { toast } = useToast();

  const { sales: allTransactions, isLoading: isLoadingSales } = useDexieSales(); 
  const { currencies, isLoading: isLoadingCurrencies } = useDexieCurrencies();
  const { clients, isLoading: isLoadingClients } = useDexieClients();
  const { paymentMethods, isLoading: isLoadingPaymentMethods } = useDexiePaymentMethods();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29), 
    to: new Date(),
  });
  
  const [sortConfig, setSortConfig] = useState<SortConfig<SaleTransaction> | null>(null);
  const [isGridSettingsDialogOpen, setIsGridSettingsDialogOpen] = useState(false);
  const [groupingKeys, setGroupingKeys] = useState<string[]>([]);
  const [columnDefinitions, setColumnDefinitions] = useState<ColumnDefinition<SaleTransaction>[]>([]);
  const [persistedColumnSettings, setPersistedColumnSettings] = useState<PersistedColumnSetting[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('all');
  const [selectedDispatchStatus, setSelectedDispatchStatus] = useState<string>('all');

  const defaultCurrency = useMemo(() => currencies.find(c => c.isDefault) || currencies[0], [currencies]);

  const getDefaultColumnDefinitions = useCallback((translateFn: typeof t): ColumnDefinition<SaleTransaction>[] => [
    { key: 'id', label: translateFn('SalesTable.headerTransactionId'), isSortable: true, isGroupable: false, className: "w-[150px]" },
    { key: 'date', label: translateFn('SalesTable.headerDate'), isSortable: true, isGroupable: true },
    { key: 'clientName', label: translateFn('SalesTable.headerClient'), isSortable: true, isGroupable: true },
    { key: 'items', label: translateFn('SalesTable.headerItems'), isSortable: true, isGroupable: false, className: "text-right" },
    { key: 'subtotal', label: translateFn('SalesTable.headerSubtotal'), isSortable: true, isGroupable: false, className: "text-right" },
    { key: 'taxAmount', label: translateFn('SalesTable.headerTax'), isSortable: true, isGroupable: false, className: "text-right" },
    { key: 'totalAmount', label: translateFn('SalesTable.headerTotalAmount'), isSortable: true, isGroupable: false, className: "text-right" },
    { key: 'appliedPayments', label: translateFn('SalesTable.headerPaymentMethod'), isSortable: false, isGroupable: true, className: "text-center" },
    { key: 'currencyCode', label: translateFn('SalesTable.headerCurrency'), isSortable: true, isGroupable: true, className: "text-center" },
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

  const persistGridSettingsToApi = useCallback(async (settingsToPersist: GridSetting) => {
    try {
      await fetch('/api/grid-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToPersist),
      });
    } catch (error) {
      toast({ variant: 'destructive', title: t('Common.error'), description: 'Failed to save grid preferences.' });
    }
  }, [toast, t]);

  useEffect(() => {
    const fetchGridSettings = async () => {
      try {
        const response = await fetch(`/api/grid-settings?pagePath=${PAGE_PATH}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const savedSettings = result.data as GridSetting;
            setPersistedColumnSettings(savedSettings.columns);
            setSortConfig(savedSettings.sortConfig || null);
            setGroupingKeys(Array.isArray(savedSettings.groupingKeys) ? savedSettings.groupingKeys : []);
          }
        }
      } catch (error) {
        console.error('Error fetching grid settings:', error);
      }
    };
    if (!isLoadingTranslations) {
      fetchGridSettings();
    }
  }, [isLoadingTranslations]);

  const filteredTransactions = useMemo(() => {
    let transactions = allTransactions;

    // Filter by date range
    if (dateRange?.from) {
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0,0,0,0);
      transactions = transactions.filter(trans => new Date(trans.date) >= fromDate);
    }
    if (dateRange?.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23,59,59,999);
      transactions = transactions.filter(trans => new Date(trans.date) <= toDate);
    }

    if (selectedClientId && selectedClientId !== 'all') {
      if (selectedClientId === 'walk-in') {
        transactions = transactions.filter(t => !t.clientId);
      } else {
        transactions = transactions.filter(t => t.clientId === selectedClientId);
      }
    }
    
    if (selectedPaymentMethodId && selectedPaymentMethodId !== 'all') {
      transactions = transactions.filter(t => t.appliedPayments.some(p => p.methodId === selectedPaymentMethodId));
    }
    
    if (selectedDispatchStatus && selectedDispatchStatus !== 'all') {
      transactions = transactions.filter(t => t.dispatchStatus === selectedDispatchStatus);
    }

    // Filter by search term
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      transactions = transactions.filter(trans => 
        trans.id.toLowerCase().includes(lowercasedTerm) ||
        (trans.clientName && trans.clientName.toLowerCase().includes(lowercasedTerm))
      );
    }

    return transactions;
  }, [allTransactions, dateRange, searchTerm, selectedClientId, selectedPaymentMethodId, selectedDispatchStatus]);

  const handleExport = () => {
    if (processedTransactions.length === 0) {
      toast({
        title: t('SalesReportPage.noDataToExportTitle'),
        description: t('SalesReportPage.noDataToExportDescription'),
        variant: 'default'
      });
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(processedTransactions.filter(item => !('isGroupHeader' in item))));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "sales_report.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };
  
  const handleImport = () => {
     toast({
        title: t('Common.error'),
        description: `Importing historical sales data is not a supported feature.`,
        variant: 'destructive'
    });
  }

  const handleSortRequest = useCallback((key: keyof SaleTransaction | string, direction: 'asc' | 'desc' | null) => {
    const newSortConfig = direction ? { key, direction } : null;
    setSortConfig(newSortConfig);
    persistGridSettingsToApi({ pagePath: PAGE_PATH, columns: persistedColumnSettings, sortConfig: newSortConfig, groupingKeys });
  }, [persistedColumnSettings, groupingKeys, persistGridSettingsToApi]);

  const handleToggleGroupingKey = useCallback((key: string) => {
    setGroupingKeys(currentKeys => {
        const newKeys = currentKeys.includes(key) ? currentKeys.filter(k => k !== key) : [...currentKeys, key];
        persistGridSettingsToApi({ pagePath: PAGE_PATH, columns: persistedColumnSettings, sortConfig, groupingKeys: newKeys });
        return newKeys;
    });
  }, [persistedColumnSettings, sortConfig, persistGridSettingsToApi]);

  const handleSaveGridConfiguration = (
    newColumns: PersistedColumnSetting[],
    newSortConfig: SortConfig<SaleTransaction> | null,
    newGroupingKeys: string[]
  ) => {
    setPersistedColumnSettings(newColumns);
    setSortConfig(newSortConfig);
    setGroupingKeys(newGroupingKeys);
    
    const settingsToSavePayload: GridSetting = {
      pagePath: PAGE_PATH,
      columns: newColumns,
      sortConfig: newSortConfig,
      groupingKeys: newGroupingKeys
    };
    persistGridSettingsToApi(settingsToSavePayload);
    setIsGridSettingsDialogOpen(false);
  };

  const processedTransactions = useMemo(() => {
    let items = [...filteredTransactions];
    if (sortConfig) {
      items.sort((a, b) => {
        const valA = (a as any)[sortConfig.key];
        const valB = (b as any)[sortConfig.key];
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') comparison = valA - valB;
        else if (typeof valA === 'string' && typeof valB === 'string') comparison = valA.localeCompare(valB);
        else comparison = String(valA).localeCompare(String(valB));
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    // Note: Grouping logic would go here if needed
    return items;
  }, [filteredTransactions, sortConfig]);
  
  const finalColumnConfig = useMemo(() => {
    if (columnDefinitions.length === 0) return [];
    return persistedColumnSettings.map(pCol => {
        const definition = columnDefinitions.find(def => def.key === pCol.key);
        return definition ? { ...definition, visible: pCol.visible } : null;
      }).filter(Boolean) as ColumnDefinition<SaleTransaction>[];
  }, [columnDefinitions, persistedColumnSettings]);

  if (isLoadingTranslations || isLoadingSales || isLoadingCurrencies || isLoadingClients || isLoadingPaymentMethods) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,64px)-4rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-headline font-semibold text-primary">{t('Header.salesLink')}</h1>
        <div className="flex gap-2 items-center">
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
                      <Button onClick={handleImport} variant="outline" size="icon" aria-label={t('ProductManagementPage.importProductsButton')}>
                          <Upload className="h-5 w-5" />
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{t('ProductManagementPage.importProductsButton')}</p></TooltipContent>
              </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button onClick={handleExport} variant="outline" size="icon" aria-label={t('ProductManagementPage.exportProductsButton')}>
                    <Download className="h-5 w-5" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent><p>{t('ProductManagementPage.exportProductsButton')}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <Card className="shadow-xl">
        <CardHeader>
            <CardTitle>{t('SalesReportPage.reportBuilderTitle')}</CardTitle>
            <CardDescription>{t('SalesReportPage.reportBuilderDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 p-3 border rounded-md bg-muted/50">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className="w-auto justify-start text-left font-normal min-w-[240px] bg-background"
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                        dateRange.to ? (
                            <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(dateRange.from, "LLL dd, y")
                        )
                        ) : (
                        <span>{t('SalesReportPage.pickDateRange')}</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>

                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger className="w-full sm:w-auto min-w-[180px] bg-background"><SelectValue placeholder={t('SalesReportPage.filterByClient')} /></SelectTrigger>
                    <SelectContent><SelectItem value="all">{t('SalesReportPage.allClients')}</SelectItem><SelectItem value="walk-in">{t('SalesTable.walkInBadge')}</SelectItem>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>

                <Select value={selectedPaymentMethodId} onValueChange={setSelectedPaymentMethodId}>
                    <SelectTrigger className="w-full sm:w-auto min-w-[180px] bg-background"><SelectValue placeholder={t('SalesReportPage.filterByPaymentMethod')} /></SelectTrigger>
                    <SelectContent><SelectItem value="all">{t('SalesReportPage.allPaymentMethods')}</SelectItem>{paymentMethods.map(pm => <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>)}</SelectContent>
                </Select>

                <Select value={selectedDispatchStatus} onValueChange={setSelectedDispatchStatus}>
                    <SelectTrigger className="w-full sm:w-auto min-w-[180px] bg-background"><SelectValue placeholder={t('SalesReportPage.filterByDispatchStatus')} /></SelectTrigger>
                    <SelectContent><SelectItem value="all">{t('SalesReportPage.allStatuses')}</SelectItem><SelectItem value="Pending">{t('SalesReportPage.statusPending')}</SelectItem><SelectItem value="Partially Dispatched">{t('SalesReportPage.statusPartiallyDispatched')}</SelectItem><SelectItem value="Dispatched">{t('SalesReportPage.statusDispatched')}</SelectItem></SelectContent>
                </Select>
                 <div className="relative flex-grow min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                    type="search"
                    placeholder={t('SalesReportPage.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full bg-background"
                    />
                </div>
            </div>
            {isLoadingSales && allTransactions.length === 0 ? (
                <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : (
                <SalesTable 
                transactions={processedTransactions}
                onSort={handleSortRequest}
                currentSortKey={sortConfig?.key}
                currentSortDirection={sortConfig?.direction}
                displayColumns={finalColumnConfig.filter(c => c.visible)}
                columnDefinitions={columnDefinitions}
                groupingKeys={groupingKeys}
                onToggleGroup={handleToggleGroupingKey}
                defaultCurrency={defaultCurrency}
                />
            )}
        </CardContent>
      </Card>
      <GridSettingsDialog<SaleTransaction>
        open={isGridSettingsDialogOpen}
        onOpenChange={setIsGridSettingsDialogOpen}
        pagePath={PAGE_PATH}
        allColumnDefinitions={columnDefinitions}
        currentPersistedSettings={persistedColumnSettings}
        currentSortConfig={sortConfig}
        currentGroupingKeys={groupingKeys}
        onSave={handleSaveGridConfiguration}
      />
    </div>
  );
}
