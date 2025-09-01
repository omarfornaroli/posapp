// src/components/reports/tabs/SuppliersReportTab.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useDexieSuppliers } from '@/hooks/useDexieSuppliers';
import { useDexieProducts } from '@/hooks/useDexieProducts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SuppliersReportTab() {
  const { t } = useRxTranslate();
  const { suppliers, isLoading: isLoadingSuppliers } = useDexieSuppliers();
  const { products, isLoading: isLoadingProducts } = useDexieProducts();

  const supplierMetrics = useMemo(() => {
    return suppliers.map(supplier => {
      const suppliedProducts = products.filter(p => (p.supplier as any)?._id === supplier.id || p.supplier === supplier.id || (p.supplier as any)?.name === supplier.name);
      const totalStockValue = suppliedProducts.reduce((sum, p) => sum + (p.cost || 0) * p.quantity, 0);
      return {
        ...supplier,
        productCount: suppliedProducts.length,
        totalStockValue,
      };
    }).sort((a,b) => b.totalStockValue - a.totalStockValue);
  }, [suppliers, products]);

  if (isLoadingSuppliers || isLoadingProducts) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Header.suppliersLink')}</CardTitle>
        <CardDescription>Analyze your suppliers by product count and stock value.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border shadow-sm max-h-[60vh] overflow-auto relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-center">Products Supplied</TableHead>
                <TableHead className="text-right">Total Stock Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierMetrics.map(supplier => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.contactPerson || 'N/A'}</TableCell>
                  <TableCell className="text-center">{supplier.productCount}</TableCell>
                  <TableCell className="text-right">${supplier.totalStockValue.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
