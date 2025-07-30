'use client';

import type { DashboardSummary, Currency } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Users, Package } from 'lucide-react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Skeleton } from '../ui/skeleton';

interface DashboardStatsProps {
  summary: DashboardSummary | null;
  selectedCurrency: Currency | null;
}

export default function DashboardStats({ summary, selectedCurrency }: DashboardStatsProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations } = useRxTranslate();
  const currentLocale = useLocale();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  if (!summary) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
                 <Card key={i} className="shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-32" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
  }

  // Calculate display values based on selected currency
  const exchangeRate = selectedCurrency?.exchangeRate || 1;
  const symbol = selectedCurrency?.symbol || summary.baseCurrencySymbol;
  const decimals = selectedCurrency?.decimalPlaces ?? 2;

  const formatCurrency = (value: number) => {
    return `${symbol}${(value * exchangeRate).toFixed(decimals)}`;
  };


  const stats = [
    { title: t('Dashboard.salesToday'), value: formatCurrency(summary.salesToday), icon: DollarSign },
    { title: t('Dashboard.salesMonth'), value: formatCurrency(summary.salesMonth), icon: ShoppingCart },
    { title: t('Dashboard.totalProducts'), value: summary.totalProducts.toLocaleString(), icon: Package },
    { title: t('Dashboard.totalClients'), value: summary.totalClients.toLocaleString(), icon: Users },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index} className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
