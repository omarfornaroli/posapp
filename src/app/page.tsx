
'use client';

import { useEffect, useMemo } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useAuth } from '@/context/AuthContext';
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Loader2 } from 'lucide-react';
import { useDexieDashboardSummary } from '@/hooks/useDexieDashboardSummary';
import DashboardStats from '@/components/dashboard/DashboardStats';
import SalesChart from '@/components/dashboard/SalesChart';
import RecentSales from '@/components/dashboard/RecentSales';
import LowStockProducts from '@/components/dashboard/LowStockProducts';
import { useCurrency } from '@/context/CurrencyContext';
import { useDexieCurrencies } from '@/hooks/useDexieCurrencies';
import type { Currency } from '@/types';
import { unstable_setRequestLocale } from 'next-intl/server';

interface DashboardPageProps {
  params: {
    locale: string;
  };
}

export default function DashboardPage({ params }: DashboardPageProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  
  useEffect(() => {
    // No need to call unstable_setRequestLocale here on client, it's for server rendering.
    // The layout handles setting the locale for the context.
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const { summary, isLoading } = useDexieDashboardSummary();
  const { currency: selectedCurrencyCode } = useCurrency();
  const { currencies, isLoading: isLoadingCurrencies } = useDexieCurrencies();

  const selectedCurrency: Currency | null = useMemo(() => {
    if (isLoadingCurrencies || !currencies.length) return null;
    return currencies.find(c => c.code === selectedCurrencyCode) || currencies.find(c => c.isDefault) || currencies[0] || null;
  }, [selectedCurrencyCode, currencies, isLoadingCurrencies]);

  if (!hasPermission('access_dashboard_page')) {
    return <AccessDeniedMessage />;
  }

  const isLoadingInitialData = isLoadingTranslations || isLoading || isLoadingCurrencies || !summary || !selectedCurrency;

  if (isLoadingInitialData) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,64px)-4rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold text-primary">{t('Dashboard.title')}</h1>
      
      <DashboardStats summary={summary} selectedCurrency={selectedCurrency} />

      <div className="grid gap-6 mt-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <SalesChart salesData={summary.salesByDay} baseCurrencySymbol={summary.baseCurrencySymbol} selectedCurrency={selectedCurrency} />
        </div>
        <div className="lg:col-span-3">
          <RecentSales sales={summary.recentSales} baseCurrencySymbol={summary.baseCurrencySymbol} selectedCurrency={selectedCurrency} />
        </div>
      </div>
      
      <div className="mt-6">
        <LowStockProducts products={summary.lowStockProducts} />
      </div>
    </div>
  );
}
