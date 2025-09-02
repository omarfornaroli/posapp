
// src/components/reports/tabs/ProfitMarginReportTab.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useDexieSales } from '@/hooks/useDexieSales';
import { useDexieReturns } from '@/hooks/useDexieReturns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, DollarSign, TrendingUp, TrendingDown, ChevronsRight } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ProfitMetrics {
    totalRevenue: number;
    totalCostOfGoodsSold: number;
    totalReturns: number;
    grossProfit: number;
    profitMargin: number;
}

export default function ProfitMarginReportTab() {
    const { t } = useRxTranslate();
    const { sales, isLoading: isLoadingSales } = useDexieSales();
    const { returns, isLoading: isLoadingReturns } = useDexieReturns();
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    const metrics: ProfitMetrics = useMemo(() => {
        const filteredSales = sales.filter(s => {
            if (!dateRange) return true;
            const saleDate = new Date(s.date);
            return (!dateRange.from || saleDate >= dateRange.from) && (!dateRange.to || saleDate <= dateRange.to);
        });

        const filteredReturns = returns.filter(r => {
            if (!dateRange) return true;
            const returnDate = new Date(r.returnDate);
            return (!dateRange.from || returnDate >= dateRange.from) && (!dateRange.to || returnDate <= dateRange.to);
        });

        const totalRevenue = filteredSales.reduce((sum, s) => sum + s.subtotal - (s.promotionalDiscountAmount || 0) - (s.overallDiscountAmountApplied || 0) - (s.totalItemDiscountAmount || 0), 0);
        const totalCostOfGoodsSold = filteredSales.flatMap(s => s.items).reduce((sum, item) => sum + ((item.cost || 0) * item.quantity), 0);
        const totalReturns = filteredReturns.reduce((sum, r) => sum + r.totalRefundAmount, 0);

        const grossProfit = totalRevenue - totalCostOfGoodsSold - totalReturns;
        const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        return { totalRevenue, totalCostOfGoodsSold, totalReturns, grossProfit, profitMargin };

    }, [sales, returns, dateRange]);
    
    if (isLoadingSales || isLoadingReturns) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const stats = [
        { title: t('ProfitMarginReport.totalRevenue'), value: metrics.totalRevenue, icon: DollarSign },
        { title: t('ProfitMarginReport.totalCogs'), value: metrics.totalCostOfGoodsSold, icon: TrendingDown },
        { title: t('ProfitMarginReport.totalReturns'), value: metrics.totalReturns, icon: Undo },
        { title: t('ProfitMarginReport.grossProfit'), value: metrics.grossProfit, icon: TrendingUp },
    ];
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('ProfitMarginReport.title')}</CardTitle>
                <CardDescription>{t('ProfitMarginReport.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 border rounded-lg">
                    <DateRangePicker date={dateRange} setDate={setDateRange} placeholder={t('SalesReportPage.pickDateRange')} />
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {stats.map(stat => (
                        <Card key={stat.title}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                                <stat.icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">${stat.value.toFixed(2)}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{t('ProfitMarginReport.marginTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center gap-4 p-6 bg-muted rounded-lg">
                           <div className="text-4xl font-bold text-primary">{metrics.profitMargin.toFixed(2)}%</div>
                           <div className="text-muted-foreground">{t('ProfitMarginReport.marginDescription')}</div>
                        </div>
                    </CardContent>
                </Card>

            </CardContent>
        </Card>
    );
}

