
// src/components/reports/tabs/ReturnsReportTab.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useDexieReturns } from '@/hooks/useDexieReturns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function ReturnsReportTab() {
  const { t } = useRxTranslate();
  const { returns, isLoading } = useDexieReturns();

  const sortedReturns = useMemo(() => {
    return [...returns].sort((a, b) => new Date(b.returnDate).getTime() - new Date(a.returnDate).getTime());
  }, [returns]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const totalRefunded = sortedReturns.reduce((sum, item) => sum + item.totalRefundAmount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Header.returnsLink')}</CardTitle>
        <CardDescription>{t('ReturnsPage.reportDescription', { count: sortedReturns.length, total: totalRefunded.toFixed(2) })}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border shadow-sm max-h-[60vh] overflow-auto relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('ReturnsPage.tableHeaderDate')}</TableHead>
                <TableHead>{t('ReturnsPage.tableHeaderOriginalSale')}</TableHead>
                <TableHead>{t('ReturnsPage.tableHeaderItems')}</TableHead>
                <TableHead className="text-right">{t('ReturnsPage.tableHeaderRefundAmount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReturns.map(ret => (
                <TableRow key={ret.id}>
                  <TableCell>{format(new Date(ret.returnDate), 'PPpp')}</TableCell>
                  <TableCell className="font-mono text-xs">{ret.originalSaleId}</TableCell>
                  <TableCell>{ret.items.map(item => `${item.name} (x${item.quantity})`).join(', ')}</TableCell>
                  <TableCell className="text-right font-semibold">${ret.totalRefundAmount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {sortedReturns.length === 0 && <p className="text-center text-muted-foreground p-8">{t('ReturnsPage.noReturnsFound')}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

