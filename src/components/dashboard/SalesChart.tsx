'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { format } from 'date-fns';
import type { Currency } from '@/types';
import { useEffect } from 'react';

interface SalesChartProps {
  salesData: { date: string; total: number }[];
  baseCurrencySymbol: string;
  selectedCurrency: Currency | null;
}

export default function SalesChart({ salesData, baseCurrencySymbol, selectedCurrency }: SalesChartProps) {
  const { t, initializeTranslations, currentLocale } = useRxTranslate();

  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);


  const exchangeRate = selectedCurrency?.exchangeRate || 1;
  const symbol = selectedCurrency?.symbol || baseCurrencySymbol;
  const decimals = selectedCurrency?.decimalPlaces ?? 2;

  const chartConfig = {
    total: {
      label: t('Dashboard.sales'),
      color: 'hsl(var(--primary))',
    },
  };

  const formattedData = salesData.map(item => ({
    ...item,
    date: format(new Date(item.date), 'MMM d'),
    total: item.total * exchangeRate
  }));

  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle className="font-headline">{t('Dashboard.salesOverTimeTitle')}</CardTitle>
        <CardDescription>{t('Dashboard.salesOverTimeDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={formattedData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value}
              className="text-xs"
            />
            <YAxis 
               tickFormatter={(value) => `${symbol}${Number(value).toFixed(0)}`}
               className="text-xs"
            />
            <Tooltip
              cursor={false}
              content={<ChartTooltipContent 
                formatter={(value) => `${symbol}${Number(value).toFixed(decimals)}`}
                labelClassName='font-bold'
                indicator="dot"
              />}
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
