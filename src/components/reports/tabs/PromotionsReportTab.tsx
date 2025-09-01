// src/components/reports/tabs/PromotionsReportTab.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useDexiePromotions } from '@/hooks/useDexiePromotions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function PromotionsReportTab() {
  const { t } = useRxTranslate();
  const { promotions, isLoading: isLoadingPromotions } = useDexiePromotions();

  const sortedPromotions = useMemo(() => {
    return [...promotions].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [promotions]);

  if (isLoadingPromotions) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Header.promotionsLink')}</CardTitle>
        <CardDescription>View all configured promotions and their status.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border shadow-sm max-h-[60vh] overflow-auto relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPromotions.map(promo => (
                <TableRow key={promo.id}>
                  <TableCell className="font-medium">{promo.name}</TableCell>
                  <TableCell>
                    {promo.discountValue}{promo.discountType === 'percentage' ? '%' : '$'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(promo.startDate), 'MMM d, yyyy')} - {promo.endDate ? format(new Date(promo.endDate), 'MMM d, yyyy') : 'No End'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={promo.isActive ? 'default' : 'secondary'}>
                      {promo.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
