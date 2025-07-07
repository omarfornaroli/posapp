
// src/hooks/useDexieDashboardSummary.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import type { DashboardSummary } from '@/types';
import { useState, useEffect, useMemo } from 'react';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, eachDayOfInterval, format, isValid } from 'date-fns';

export function useDexieDashboardSummary() {
  const [isLoading, setIsLoading] = useState(true);

  const sales = useLiveQuery(() => db.sales.toArray(), []);
  const products = useLiveQuery(() => db.products.toArray(), []);
  const clients = useLiveQuery(() => db.clients.toArray(), []);
  const defaultCurrency = useLiveQuery(() => db.currencies.filter(c => c.isDefault === true).first(), []);

  const summary = useMemo<DashboardSummary | null>(() => {
    if (!sales || !products || !clients || !defaultCurrency) {
      return null;
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const last30DaysStart = startOfDay(subDays(now, 29));

    const salesToday = sales
      .filter(s => {
          const saleDate = new Date(s.date);
          return isValid(saleDate) && saleDate >= todayStart && saleDate <= todayEnd;
       })
      .reduce((sum, s) => sum + s.totalInBaseCurrency, 0);

    const salesMonth = sales
      .filter(s => {
          const saleDate = new Date(s.date);
          return isValid(saleDate) && saleDate >= monthStart && saleDate <= monthEnd;
      })
      .reduce((sum, s) => sum + s.totalInBaseCurrency, 0);

    const totalProducts = products.length;
    const totalClients = clients.length;

    const lowStockProducts = products
      .filter(p => !p.isService && p.quantity <= (p.warningQuantity ?? 0))
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 10);
      
    const recentSales = sales
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    const salesByDayData = sales
      .filter(s => {
          const saleDate = new Date(s.date);
          return isValid(saleDate) && saleDate >= last30DaysStart && saleDate <= todayEnd;
      })
      .reduce((acc, s) => {
          const day = format(new Date(s.date), 'yyyy-MM-dd');
          acc[day] = (acc[day] || 0) + s.totalInBaseCurrency;
          return acc;
      }, {} as Record<string, number>);

    const dateInterval = eachDayOfInterval({ start: last30DaysStart, end: todayEnd });
    const salesByDay = dateInterval.map(date => {
        const formattedDate = format(date, 'yyyy-MM-dd');
        return {
            date: formattedDate,
            total: salesByDayData[formattedDate] || 0
        };
    });

    return {
      salesToday,
      salesMonth,
      totalProducts,
      totalClients,
      lowStockProducts,
      recentSales,
      salesByDay,
      baseCurrencySymbol: defaultCurrency?.symbol || '$',
    };
  }, [sales, products, clients, defaultCurrency]);
  
  useEffect(() => {
    if (sales !== undefined && products !== undefined && clients !== undefined && defaultCurrency !== undefined) {
      setIsLoading(false);
    }
  }, [sales, products, clients, defaultCurrency]);

  return { summary, isLoading };
}
