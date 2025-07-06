'use client';

import React, { useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { SaleTransaction, ColumnDefinition, GroupedTableItem, Currency } from "@/types";
import { Eye, User, ArrowUpAZ, ArrowDownAZ, ChevronsUpDown, MoreVertical, Layers, Loader2, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useRxTranslate } from '@/hooks/use-rx-translate';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const SaleCard = ({ transaction, t }: { transaction: SaleTransaction, t: Function }) => {
  return (
    <Card className="mb-2">
        <CardHeader className="p-4">
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle className="text-sm font-mono">ID: {transaction.id.slice(-8).toUpperCase()}</CardTitle>
                    <CardDescription>{new Date(transaction.date).toLocaleString()}</CardDescription>
                </div>
                 <Button variant="ghost" size="icon" asChild className="h-8 w-8 -mt-2 -mr-2">
                    <Link href={`/receipt/${transaction.id}`} aria-label={t('SalesTable.viewReceiptActionLabel', {transactionId: transaction.id})}>
                        <Eye className="h-5 w-5 text-primary" />
                    </Link>
                </Button>
            </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2 text-sm">
             <div className="flex justify-between items-center"><span className="text-muted-foreground">{t('SalesTable.headerClient')}:</span> <span className="font-medium">{transaction.clientName || t('SalesTable.walkInBadge')}</span></div>
             <div className="flex justify-between items-center"><span className="text-muted-foreground">{t('SalesTable.headerItems')}:</span> <span>{transaction.items.reduce((sum, item) => sum + item.quantity, 0)}</span></div>
             <div className="flex justify-between items-center"><span className="text-muted-foreground">{t('SalesTable.headerTotalAmount')}:</span> <span className="font-bold text-primary">{`${transaction.currencySymbol || '$'}${(transaction.totalAmount).toFixed(transaction.currencyDecimalPlaces || 2)}`}</span></div>
        </CardContent>
    </Card>
  );
};

interface SalesTableProps {
  transactions: Array<SaleTransaction | GroupedTableItem<SaleTransaction>>;
  displayColumns: ColumnDefinition<SaleTransaction>[];
  columnDefinitions: ColumnDefinition<SaleTransaction>[];
  onSort: (key: keyof SaleTransaction | string, direction: 'asc' | 'desc' | null) => void;
  currentSortKey?: keyof SaleTransaction | string | null;
  currentSortDirection?: 'asc' | 'desc' | null;
  groupingKeys: string[];
  onToggleGroup: (key: string) => void;
  defaultCurrency: Currency | null;
}

export default function SalesTable({ 
  transactions,
  displayColumns,
  columnDefinitions,
  onSort,
  currentSortKey,
  currentSortDirection,
  groupingKeys,
  onToggleGroup,
  defaultCurrency
}: SalesTableProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  if (isLoadingTranslations && (!transactions || transactions.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{t('SalesTable.noTransactionsMessage')}</p>;
  }

  const formatPaymentMethods = (payments: SaleTransaction['appliedPayments']) => {
    if (!payments || payments.length === 0) return 'N/A';
    if (payments.length === 1) return payments[0].methodName;
    return payments.map(p => p.methodName).join(', ');
  };
  
  const renderCellContent = (transaction: SaleTransaction, columnKey: keyof SaleTransaction | string) => {
    const value = transaction[columnKey as keyof SaleTransaction];
    
    switch(columnKey) {
        case 'id':
            return <span className="font-mono text-xs">{String(value)}</span>;
        case 'date':
            return new Date(value as string).toLocaleString();
        case 'clientName':
            return value ? <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{String(value)}</div> : <Badge variant="secondary" className="whitespace-nowrap">{t('SalesTable.walkInBadge')}</Badge>;
        case 'items':
            return (transaction.items || []).reduce((sum, item) => sum + item.quantity, 0);
        case 'subtotal':
        case 'taxAmount':
            const subValue = value as number;
            return `${transaction.currencySymbol || '$'}${(subValue).toFixed(transaction.currencyDecimalPlaces || 2)}`;
        case 'totalAmount':
            const totalInTxCurrency = `${transaction.currencySymbol || '$'}${(transaction.totalAmount).toFixed(transaction.currencyDecimalPlaces || 2)}`;
            if (transaction.currencyCode !== transaction.baseCurrencyCode) {
                const totalInBase = `${defaultCurrency?.symbol || '$'}${(transaction.totalInBaseCurrency).toFixed(defaultCurrency?.decimalPlaces || 2)}`;
                return (
                    <div>
                        <p>{totalInTxCurrency}</p>
                        <p className="text-xs text-muted-foreground">({totalInBase})</p>
                    </div>
                );
            }
            return totalInTxCurrency;
        case 'appliedPayments':
            return formatPaymentMethods(transaction.appliedPayments);
        case 'currencyCode':
            return <Badge variant="outline">{transaction.currencyCode}</Badge>;
        default:
            return String(value ?? '');
    }
  };


  const SortableHeader = ({ columnDef }: { columnDef: ColumnDefinition<SaleTransaction> }) => {
    const { key, label, isSortable, isGroupable } = columnDef;
    const isCurrentSortColumn = currentSortKey === key;
    const isCurrentlyGrouped = groupingKeys.includes(String(key));
    
    const handleSortClick = () => {
      if (!isSortable) return;
      if (isCurrentSortColumn) {
        onSort(key, currentSortDirection === 'asc' ? 'desc' : currentSortDirection === 'desc' ? null : 'asc');
      } else {
        onSort(key, 'asc');
      }
    };

    let SortIcon = ChevronsUpDown;
    if (isSortable && isCurrentSortColumn) {
      SortIcon = currentSortDirection === 'asc' ? ArrowUpAZ : ArrowDownAZ;
    }

    return (
      <div className="flex items-center justify-between group">
        {label}
        <div className="flex items-center">
          {isSortable && (
            <Button variant="ghost" size="icon" onClick={handleSortClick} className="h-7 w-7 ml-2">
              <SortIcon className="h-4 w-4 opacity-40 group-hover:opacity-100" />
            </Button>
          )}
          {isGroupable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={cn("h-7 w-7", isCurrentlyGrouped && "text-primary")}>
                  <MoreVertical className="h-4 w-4 opacity-40 group-hover:opacity-100" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onToggleGroup(String(key))}>
                  {isCurrentlyGrouped ? <Minus className="mr-2 h-3.5 w-3.5 text-destructive" /> : <Plus className="mr-2 h-3.5 w-3.5 text-green-600" />}
                  {isCurrentlyGrouped ? t('TableActions.removeFromGrouping') : t('TableActions.addToGrouping')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    );
  };
  
  const RenderMobileCards: React.FC<{ items: Array<SaleTransaction | GroupedTableItem<SaleTransaction>> }> = ({ items }) => (
    <>
      {items.map((item, index) => {
        if ('isGroupHeader' in item) {
          const groupDef = columnDefinitions.find(c => c.key === item.groupKey);
          return (
            <div key={`group-mob-${item.groupKey}-${item.groupValue}`} className="mt-4">
              <div className="p-2 mb-2 bg-muted rounded-md sticky top-0 z-10">
                <h3 className="font-bold text-primary">{groupDef?.label || item.groupKey}: {item.groupValue}</h3>
              </div>
              <RenderMobileCards items={item.items} />
            </div>
          );
        }
        const transaction = item as SaleTransaction;
        return <SaleCard key={transaction.id} transaction={transaction} t={t} />;
      })}
    </>
  );

  const RenderDesktopRows: React.FC<{ items: Array<SaleTransaction | GroupedTableItem<SaleTransaction>>, level: number }> = ({ items, level }) => {
    return (
      <>
        {items.map((item, index) => {
          if ('isGroupHeader' in item) {
            const groupDef = columnDefinitions.find(c => c.key === item.groupKey);
            return (
              <React.Fragment key={`group-${item.groupKey}-${item.groupValue}-${level}`}>
                <TableRow className="bg-muted/60 hover:bg-muted/80">
                  <TableCell colSpan={displayColumns.length + 2} className="py-2 font-semibold text-primary" style={{ paddingLeft: `${level * 1.5 + 1}rem` }}>
                    {groupDef?.label || item.groupKey}: {item.groupValue}
                  </TableCell>
                </TableRow>
                <RenderDesktopRows items={item.items} level={level + 1} />
              </React.Fragment>
            );
          }
          const transaction = item as SaleTransaction;
          return (
            <TableRow key={transaction.id} className="hover:bg-muted/50 transition-colors">
              <TableCell className="text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/receipt/${transaction.id}`} aria-label={t('SalesTable.viewReceiptActionLabel', {transactionId: transaction.id})}>
                          <Eye className="h-5 w-5 text-primary" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('SalesTable.viewReceiptActionLabel', {transactionId: `...${transaction.id.slice(-6)}`})}</p></TooltipContent>
                  </Tooltip>
              </TableCell>
              {displayColumns.map(col => (
                <TableCell key={String(col.key)} className={cn("whitespace-nowrap", col.className)}>
                  {renderCellContent(transaction, col.key)}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="md:hidden">
        <RenderMobileCards items={transactions} />
      </div>
      <div className="hidden md:block rounded-md border shadow-md max-h-[calc(100vh-25rem)] overflow-auto relative">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-[80px] text-center font-semibold whitespace-nowrap">{t('SalesTable.headerActions')}</TableHead>
              {displayColumns.map((colDef) => (
                <TableHead key={String(colDef.key)} className={cn("font-semibold whitespace-nowrap", colDef.className)}>
                  <SortableHeader columnDef={colDef} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <RenderDesktopRows items={transactions} level={0} />
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
