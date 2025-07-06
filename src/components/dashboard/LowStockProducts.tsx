'use client';

import type { Product } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle } from 'lucide-react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import Link from 'next/link';
import { Button } from '../ui/button';

interface LowStockProductsProps {
  products: Product[];
}

export default function LowStockProducts({ products }: LowStockProductsProps) {
  const { t } = useRxTranslate();

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          {t('Dashboard.lowStockTitle')}
        </CardTitle>
        <CardDescription>{t('Dashboard.lowStockDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t('Dashboard.noLowStock')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Dashboard.productName')}</TableHead>
                <TableHead className="text-center">{t('Dashboard.stockRemaining')}</TableHead>
                <TableHead className="text-center">{t('Dashboard.reorderPoint')}</TableHead>
                <TableHead className="text-right">{t('Dashboard.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-center text-destructive font-bold">{product.quantity}</TableCell>
                  <TableCell className="text-center">{product.reorderPoint}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/products?highlight=${product.id}`}>
                            {t('Dashboard.viewProduct')}
                        </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
