// src/components/reports/tabs/ProductsReportTab.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useDexieProducts } from '@/hooks/useDexieProducts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export default function ProductsReportTab() {
  const { t } = useRxTranslate();
  const { products, isLoading: isLoadingProducts } = useDexieProducts();

  const [filters, setFilters] = useState({
    category: 'all',
    stockCondition: 'all',
    stockValue: '',
    priceFrom: '',
    priceTo: '',
    status: 'all',
    sortBy: 'name-asc',
  });

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))).sort(), [products]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(p => p.category === filters.category);
    }
    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(p => String(p.isEnabled) === filters.status);
    }
    // Stock filter
    if (filters.stockCondition !== 'all' && filters.stockValue !== '') {
      const stockVal = Number(filters.stockValue);
      if (filters.stockCondition === 'less') filtered = filtered.filter(p => p.quantity < stockVal);
      if (filters.stockCondition === 'greater') filtered = filtered.filter(p => p.quantity > stockVal);
    }
    // Price filter
    if (filters.priceFrom !== '') filtered = filtered.filter(p => p.price >= Number(filters.priceFrom));
    if (filters.priceTo !== '') filtered = filtered.filter(p => p.price <= Number(filters.priceTo));
    
    // Sorting
    const [sortKey, sortDir] = filters.sortBy.split('-');
    filtered.sort((a, b) => {
        const valA = (a as any)[sortKey];
        const valB = (b as any)[sortKey];
        const dir = sortDir === 'asc' ? 1 : -1;
        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
    });

    return filtered;
  }, [products, filters]);

  if (isLoadingProducts) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('ProductManagementPage.title')}</CardTitle>
        <CardDescription>Filter and analyze your product catalog.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 border rounded-lg">
          <Select value={filters.category} onValueChange={val => handleFilterChange('category', val)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Categories</SelectItem>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={val => handleFilterChange('status', val)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="true">Enabled</SelectItem><SelectItem value="false">Disabled</SelectItem></SelectContent>
          </Select>
          <Select value={filters.stockCondition} onValueChange={val => handleFilterChange('stockCondition', val)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Any Stock</SelectItem><SelectItem value="less">Stock Less Than</SelectItem><SelectItem value="greater">Stock Greater Than</SelectItem></SelectContent>
          </Select>
          <Input type="number" placeholder="Stock Value" value={filters.stockValue} onChange={e => handleFilterChange('stockValue', e.target.value)} />
          <Input type="number" placeholder="Price From" value={filters.priceFrom} onChange={e => handleFilterChange('priceFrom', e.target.value)} />
          <Input type="number" placeholder="Price To" value={filters.priceTo} onChange={e => handleFilterChange('priceTo', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg">
             <Select value={filters.sortBy} onValueChange={val => handleFilterChange('sortBy', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="price-asc">Price (Low to High)</SelectItem>
                    <SelectItem value="price-desc">Price (High to Low)</SelectItem>
                    <SelectItem value="quantity-asc">Stock (Low to High)</SelectItem>
                    <SelectItem value="quantity-desc">Stock (High to Low)</SelectItem>
                </SelectContent>
             </Select>
        </div>

        <div className="rounded-md border shadow-sm max-h-[60vh] overflow-auto relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedProducts.map(product => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Image src={product.imageUrl || '/placeholder.png'} alt={product.name} width={32} height={32} className="rounded-sm" data-ai-hint="product image"/>
                    {product.name}
                  </TableCell>
                  <TableCell><Badge variant="outline">{product.category}</Badge></TableCell>
                  <TableCell>{product.sku || 'N/A'}</TableCell>
                  <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{product.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
