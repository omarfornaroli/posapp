'use client';

import React, { useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { SaleTransaction, DispatchStatus } from '@/types';
import { Truck, PackageCheck, Hourglass, Loader2, Eye, TruckIcon, MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';


const DispatchCard = ({ sale, onViewDetails, t, currentLocale }: { sale: SaleTransaction, onViewDetails: (s: SaleTransaction) => void, t: Function, currentLocale: string }) => {
  const StatusIndicator = ({ status }: { status: DispatchStatus }) => {
    let icon, text, colorClass;
    switch (status) {
      case 'Dispatched':
        icon = <PackageCheck className="h-4 w-4" />;
        text = t('DispatchManager.statusDispatched');
        colorClass = 'bg-green-600 hover:bg-green-700';
        break;
      case 'Partially Dispatched':
        icon = <TruckIcon className="h-4 w-4" />;
        text = t('DispatchManager.statusPartiallyDispatched');
        colorClass = 'bg-yellow-500 hover:bg-yellow-600';
        break;
      default:
        icon = <Hourglass className="h-4 w-4" />;
        text = t('DispatchManager.statusPending');
        colorClass = 'bg-secondary text-secondary-foreground hover:bg-secondary/80';
    }
    return <Badge className={cn("flex items-center gap-1.5", colorClass)}>{icon}{text}</Badge>;
  };
  
  return (
    <Card className={cn("mb-2", sale.dispatchStatus === 'Dispatched' && 'opacity-70')}>
      <CardHeader className="p-4 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-sm">ID: <span className="font-mono">{sale.id.slice(-8).toUpperCase()}</span></CardTitle>
          <CardDescription>{format(new Date(sale.date), 'PPpp', { locale: currentLocale === 'es' ? es : enUS })}</CardDescription>
        </div>
         <Button variant="ghost" size="icon" onClick={() => onViewDetails(sale)} className="h-8 w-8 -mt-2 -mr-2">
            <Eye className="h-5 w-5 text-primary" />
          </Button>
      </CardHeader>
      <CardContent className="space-y-2 text-sm px-4 pb-4">
        <div className="flex justify-between items-center"><span className="text-muted-foreground">{t('DispatchManager.tableHeaderClient')}:</span> <span>{sale.clientName || t('SalesTable.walkInBadge')}</span></div>
        <div className="flex justify-between items-center"><span className="text-muted-foreground">{t('DispatchManager.tableHeaderTotal')}:</span> <span className="font-bold">{`${sale.currencySymbol || '$'}${sale.totalAmount.toFixed(sale.currencyDecimalPlaces || 2)}`}</span></div>
        <div className="flex justify-between items-center"><span className="text-muted-foreground">{t('DispatchManager.tableHeaderStatus')}:</span> <StatusIndicator status={sale.dispatchStatus} /></div>
      </CardContent>
    </Card>
  );
}


interface DispatchListTableProps {
  sales: SaleTransaction[];
  onViewDetails: (sale: SaleTransaction) => void;
  isLoading: boolean;
}

export default function DispatchListTable({ sales, onViewDetails, isLoading }: DispatchListTableProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const StatusIndicator = ({ status }: { status: DispatchStatus }) => {
    if (status === 'Dispatched') {
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700 flex items-center gap-1.5 w-fit mx-auto">
          <PackageCheck className="h-4 w-4" />
          {t('DispatchManager.statusDispatched')}
        </Badge>
      );
    }
    if (status === 'Partially Dispatched') {
      return (
        <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 flex items-center gap-1.5 w-fit mx-auto">
          <TruckIcon className="h-4 w-4" />
          {t('DispatchManager.statusPartiallyDispatched')}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1.5 w-fit mx-auto">
        <Hourglass className="h-4 w-4" />
        {t('DispatchManager.statusPending')}
      </Badge>
    );
  };

  if (isLoading && sales.length === 0) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (sales.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{t('DispatchManager.noPendingDispatches')}</p>;
  }

  return (
    <TooltipProvider delayDuration={100}>
       <div className="md:hidden">
        {sales.map((sale) => (
          <DispatchCard
            key={sale.id}
            sale={sale}
            onViewDetails={onViewDetails}
            t={t}
            currentLocale={currentLocale}
          />
        ))}
      </div>
      <div className="hidden md:block rounded-md border shadow-sm max-h-[calc(100vh-22rem)] overflow-auto relative">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-[80px] text-center font-semibold">{t('DispatchManager.tableHeaderActions')}</TableHead>
              <TableHead className="min-w-[150px] font-semibold">{t('DispatchManager.tableHeaderId')}</TableHead>
              <TableHead className="min-w-[180px] font-semibold">{t('DispatchManager.tableHeaderDate')}</TableHead>
              <TableHead className="min-w-[150px] font-semibold">{t('DispatchManager.tableHeaderClient')}</TableHead>
              <TableHead className="text-right min-w-[120px] font-semibold">{t('DispatchManager.tableHeaderTotal')}</TableHead>
              <TableHead className="text-center w-[150px] font-semibold">{t('DispatchManager.tableHeaderStatus')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id} className={cn("hover:bg-muted/50", sale.dispatchStatus === 'Dispatched' && 'opacity-60')}>
                <TableCell className="text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => onViewDetails(sale)}>
                        <Eye className="h-5 w-5 text-primary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('DispatchManager.viewDetailsTooltip')}</p></TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="font-mono text-xs">{sale.id}</TableCell>
                <TableCell>{format(new Date(sale.date), 'PPpp', { locale: currentLocale === 'es' ? es : enUS })}</TableCell>
                <TableCell>{sale.clientName || t('SalesTable.walkInBadge')}</TableCell>
                <TableCell className="text-right font-medium">{`${sale.currencySymbol || '$'}${sale.totalAmount.toFixed(sale.currencyDecimalPlaces || 2)}`}</TableCell>
                <TableCell className="text-center">
                  <StatusIndicator status={sale.dispatchStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
