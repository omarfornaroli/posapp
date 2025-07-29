
'use client';

import { useEffect, useState } from 'react';
import { unstable_setRequestLocale } from 'next-intl/server';
import DashboardStats from '@/components/dashboard/DashboardStats';
import SalesChart from '@/components/dashboard/SalesChart';
import RecentSales from '@/components/dashboard/RecentSales';
import LowStockProducts from '@/components/dashboard/LowStockProducts';
import type { DashboardSummary, Currency } from '@/types';
import { Loader2 } from 'lucide-react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useDexieDashboardSummary } from '@/hooks/useDexieDashboardSummary';
import { useDexieCurrencies } from '@/hooks/useDexieCurrencies';
import { useCurrency } from '@/context/CurrencyContext';

interface DashboardPageProps {
  params: {
    locale: string;
  };
}

export default function DashboardPage({ params: { locale } }: DashboardPageProps) {
  // Although the component is a client component, this is required for static rendering with next-intl
  // unstable_setRequestLocale(locale);

  const { t } = useRxTranslate();
  const { summary: dashboardSummary, isLoading: isLoadingSummary } = useDexieDashboardSummary();
  const { currencies, isLoading: isLoadingCurrencies } = useDexieCurrencies();
  const { currency: selectedCurrencyCode } = useCurrency();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    if (currencies.length > 0) {
      const current = currencies.find(c => c.code === selectedCurrencyCode);
      const defaultCurrency = currencies.find(c => c.isDefault);
      setSelectedCurrency(current || defaultCurrency || null);
    }
  }, [selectedCurrencyCode, currencies]);
  
  const isLoading = isLoadingSummary || isLoadingCurrencies;

  if (isLoading || !dashboardSummary) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,64px)-4rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <h1 className="text-3xl font-headline font-semibold text-primary">{t('Dashboard.title')}</h1>
      </div>
      <DashboardStats summary={dashboardSummary} selectedCurrency={selectedCurrency} />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <SalesChart salesData={dashboardSummary.salesByDay} baseCurrencySymbol={dashboardSummary.baseCurrencySymbol} selectedCurrency={selectedCurrency} />
        </div>
        <div className="lg:col-span-3">
           <RecentSales sales={dashboardSummary.recentSales} baseCurrencySymbol={dashboardSummary.baseCurrencySymbol} selectedCurrency={selectedCurrency} />
        </div>
      </div>
       <LowStockProducts products={dashboardSummary.lowStockProducts} />
    </div>
  );
}
