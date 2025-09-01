// src/components/reports/tabs/SalesReportTab.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { DateRange } from 'react-day-picker';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useDexieSales } from '@/hooks/useDexieSales';
import { useDexieClients } from '@/hooks/useDexieClients';
import { useDexiePaymentMethods } from '@/hooks/useDexiePaymentMethods';
import { useDexieCurrencies } from '@/hooks/useDexieCurrencies';
import { useDexieProducts } from '@/hooks/useDexieProducts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SalesTable from '@/components/sales/SalesTable';
import { Loader2 } from 'lucide-react';
import type { SaleTransaction, SortConfig, ColumnDefinition } from '@/types';

export default function SalesReportTab() {
  const { t, currentLocale } = useRxTranslate();
  const { sales, isLoading: isLoadingSales } = useDexieSales();
  const { clients } = useDexieClients();
  const { paymentMethods } = useDexiePaymentMethods();
  const { currencies } = useDexieCurrencies();
  const { products } = useDexieProducts();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('all');
  const [selectedDispatchStatus, setSelectedDispatchStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [sortConfig, setSortConfig] = useState<SortConfig<SaleTransaction> | null>({ key: 'date', direction: 'desc' });

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))).sort(), [products]);

  const filteredTransactions = useMemo(() => {
    return sales.filter(transaction => {
      if (dateRange?.from && new Date(transaction.date) < dateRange.from) return false;
      if (dateRange?.to && new Date(transaction.date) > dateRange.to) return false;
      if (selectedClientId !== 'all' && transaction.clientId !== selectedClientId) return false;
      if (selectedPaymentMethodId !== 'all' && !transaction.appliedPayments.some(p => p.methodId === selectedPaymentMethodId)) return false;
      if (selectedDispatchStatus !== 'all' && transaction.dispatchStatus !== selectedDispatchStatus) return false;
      if (selectedCategory !== 'all' && !transaction.items.some(item => item.category === selectedCategory)) return false;

      const lowercasedTerm = searchTerm.toLowerCase();
      if (lowercasedTerm && !(transaction.id.toLowerCase().includes(lowercasedTerm) || transaction.clientName?.toLowerCase().includes(lowercasedTerm))) {
        return false;
      }
      return true;
    });
  }, [sales, dateRange, searchTerm, selectedClientId, selectedPaymentMethodId, selectedDispatchStatus, selectedCategory]);

  const sortedTransactions = useMemo(() => {
    let sortableItems = [...filteredTransactions];
    if (sortConfig) {
      sortableItems.sort((a, b) => {
        const valA = (a as any)[sortConfig.key!];
        const valB = (b as any)[sortConfig.key!];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredTransactions, sortConfig]);

  const handleSortRequest = useCallback((key: keyof SaleTransaction | string, direction: 'asc' | 'desc' | null) => {
    setSortConfig(direction ? { key, direction } : null);
  }, []);

  const columnDefinitions: ColumnDefinition<SaleTransaction>[] = useMemo(() => [
    { key: 'id', label: t('SalesTable.headerTransactionId'), isSortable: true, isGroupable: false },
    { key: 'date', label: t('SalesTable.headerDate'), isSortable: true, isGroupable: true },
    { key: 'clientName', label: t('SalesTable.headerClient'), isSortable: true, isGroupable: true },
    { key: 'items', label: t('SalesTable.headerItems'), isSortable: true, isGroupable: false, className: "text-center" },
    { key: 'totalAmount', label: t('SalesTable.headerTotalAmount'), isSortable: true, isGroupable: false, className: "text-right font-bold text-primary" },
    { key: 'appliedPayments', label: t('SalesTable.headerPaymentMethod'), isSortable: false, isGroupable: true },
  ], [t]);

  const defaultCurrency = useMemo(() => currencies?.find(c => c.isDefault), [currencies]);

  if (isLoadingSales) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('ReportsPage.basicSalesReportTitle')}</CardTitle>
        <CardDescription>{t('ReportsPage.basicSalesReportDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6 p-4 border rounded-lg">
          <DateRangePicker date={dateRange} setDate={setDateRange} placeholder={t('SalesReportPage.pickDateRange')} />
          <Input type="search" placeholder={t('SalesReportPage.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <Select value={selectedClientId} onValueChange={setSelectedClientId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('SalesReportPage.allClients')}</SelectItem>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
          <Select value={selectedPaymentMethodId} onValueChange={setSelectedPaymentMethodId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('SalesReportPage.allPaymentMethods')}</SelectItem>{paymentMethods.map(p => <SelectItem key={p.id} value={p.id}>{p.name[currentLocale] || p.name['en']}</SelectItem>)}</SelectContent></Select>
          <Select value={selectedDispatchStatus} onValueChange={setSelectedDispatchStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('SalesReportPage.allStatuses')}</SelectItem><SelectItem value="Pending">{t('SalesReportPage.statusPending')}</SelectItem><SelectItem value="Partially Dispatched">{t('SalesReportPage.statusPartiallyDispatched')}</SelectItem><SelectItem value="Dispatched">{t('SalesReportPage.statusDispatched')}</SelectItem></SelectContent></Select>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Categories</SelectItem>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
        </div>
        <SalesTable
          transactions={sortedTransactions}
          displayColumns={columnDefinitions}
          columnDefinitions={columnDefinitions}
          onSort={handleSortRequest}
          currentSortKey={sortConfig?.key}
          currentSortDirection={sortConfig?.direction}
          groupingKeys={[]}
          onToggleGroup={() => {}}
          defaultCurrency={defaultCurrency || null}
        />
      </CardContent>
    </Card>
  );
}
