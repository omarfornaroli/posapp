'use client';

import type { SaleTransaction, Currency } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText } from 'lucide-react';
import Link from 'next/link';
import { useRxTranslate } from '@/hooks/use-rx-translate';

interface RecentSalesProps {
  sales: SaleTransaction[];
  baseCurrencySymbol: string;
  selectedCurrency: Currency | null;
}

export default function RecentSales({ sales, baseCurrencySymbol, selectedCurrency }: RecentSalesProps) {
    const { t } = useRxTranslate();

    const exchangeRate = selectedCurrency?.exchangeRate || 1;
    const symbol = selectedCurrency?.symbol || baseCurrencySymbol;
    const decimals = selectedCurrency?.decimalPlaces ?? 2;

  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
            <FileText className="h-6 w-6 text-primary" />
            {t('Dashboard.recentSalesTitle')}
        </CardTitle>
        <CardDescription>{t('Dashboard.recentSalesDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {!sales || sales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('Dashboard.noRecentSales')}</p>
        ) : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('Dashboard.client')}</TableHead>
                        <TableHead className="text-right">{t('Dashboard.amount')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {sales.map((sale, index) => (
                    <TableRow key={`${sale.id}-${index}`}>
                    <TableCell>
                        <Link href={`/receipt/${sale.id}`} className="hover:underline">
                            <div className="font-medium">{sale.clientName || t('Dashboard.walkInClient')}</div>
                            <div className="text-xs text-muted-foreground">
                                {new Date(sale.date).toLocaleString()}
                            </div>
                        </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono">{`${symbol}${(sale.totalInBaseCurrency * exchangeRate).toFixed(decimals)}`}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        )}
      </CardContent>
    </Card>
  );
}
