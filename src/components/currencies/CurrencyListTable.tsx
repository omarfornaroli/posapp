'use client';

import { useEffect } from 'react';
import type { Currency } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, CheckCircle2, CircleDot, ArrowUpAZ, ArrowDownAZ, ChevronsUpDown, MoreVertical, Layers, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';


const CurrencyCard = ({ currency, onEditCurrency, onDeleteCurrency, onToggleEnable, onSetDefault, t, hasPermission }: { currency: Currency, onEditCurrency: (c: Currency) => void, onDeleteCurrency: (c: Currency) => void, onToggleEnable: (c: Currency, e: boolean) => void, onSetDefault: (id: string) => void, t: Function, hasPermission: (p: any) => boolean }) => (
    <Card className="mb-2">
      <CardHeader className="p-4 flex flex-row items-start justify-between">
        <div>
            <CardTitle className="text-base">{currency.name}</CardTitle>
            <CardDescription>{currency.code} ({currency.symbol})</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2" disabled={!hasPermission('manage_currencies_page')}><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditCurrency(currency)} disabled={!hasPermission('manage_currencies_page')}><Pencil className="mr-2 h-4 w-4" /> {t('Common.edit')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDeleteCurrency(currency)} disabled={!hasPermission('manage_currencies_page')} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> {t('Common.delete')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardFooter className="px-4 pb-4 flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
            <Switch checked={currency.isEnabled} onCheckedChange={(checked) => onToggleEnable(currency, checked)} id={`switch-mob-${currency.id}`} aria-label={t(currency.isEnabled ? 'CurrencyManager.disableAriaLabel' : 'CurrencyManager.enableAriaLabel', { currencyName: currency.name })} />
            <label htmlFor={`switch-mob-${currency.id}`}>{t('CurrencyManager.headerEnabled')}</label>
        </div>
        <Button size="sm" variant="outline" onClick={() => onSetDefault(currency.id)} disabled={!currency.isEnabled || currency.isDefault}>{currency.isDefault ? t('CurrencyManager.isDefaultBadge') : t('CurrencyManager.setDefaultButton')}</Button>
      </CardFooter>
    </Card>
);

interface CurrencyListTableProps {
  currencies: Currency[];
  onEditCurrency: (currency: Currency) => void;
  onDeleteCurrency: (currency: Currency) => void;
  onToggleEnable: (currency: Currency, isEnabled: boolean) => void;
  onSetDefault: (currencyId: string) => void;
  onSort: (key: keyof Currency | string, direction: 'asc' | 'desc' | null) => void;
  currentSortKey?: keyof Currency | string | null;
  currentSortDirection?: 'asc' | 'desc' | null;
}

export default function CurrencyListTable({
  currencies,
  onEditCurrency,
  onDeleteCurrency,
  onToggleEnable,
  onSetDefault,
  onSort,
  currentSortKey,
  currentSortDirection
}: CurrencyListTableProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  if (isLoadingTranslations && (!currencies || currencies.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currencies || currencies.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{t('CurrencyManager.noCurrenciesMessage')}</p>;
  }

  const SortableHeader = ({ columnKey, label }: { columnKey: keyof Currency | string, label: string }) => {
    const isCurrentSortColumn = currentSortKey === columnKey;

    const handleSortClick = () => {
      if (isCurrentSortColumn) {
        if (currentSortDirection === 'asc') onSort(columnKey, 'desc');
        else if (currentSortDirection === 'desc') onSort(columnKey, null);
        else onSort(columnKey, 'asc');
      } else {
        onSort(columnKey, 'asc');
      }
    };
    
    const handleGroupBy = () => {
      toast({ title: t('Common.featureComingSoonTitle'), description: t('TableActions.groupingComingSoon', { columnName: String(label) }) });
    };

    let SortIcon = ChevronsUpDown;
    if (isCurrentSortColumn) {
      if (currentSortDirection === 'asc') SortIcon = ArrowUpAZ;
      else if (currentSortDirection === 'desc') SortIcon = ArrowDownAZ;
    }

    return (
      <div className="flex items-center justify-between group">
        {label}
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={handleSortClick} className="h-7 w-7 ml-2 data-[state=open]:bg-accent" aria-label={t('TableActions.cycleSortOrder', { columnName: label })}>
            <SortIcon className="h-4 w-4 opacity-40 group-hover:opacity-100" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 data-[state=open]:bg-accent" aria-label={t('TableActions.columnActionsMenu', {columnName: label})}>
                <MoreVertical className="h-4 w-4 opacity-40 group-hover:opacity-100" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleGroupBy}>
                <Layers className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                {t('TableActions.groupByThisColumn')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
       <div className="md:hidden">
        {currencies.map((currency) => (
          <CurrencyCard 
            key={currency.id}
            currency={currency}
            onEditCurrency={onEditCurrency}
            onDeleteCurrency={onDeleteCurrency}
            onToggleEnable={onToggleEnable}
            onSetDefault={onSetDefault}
            t={t}
            hasPermission={hasPermission}
          />
        ))}
      </div>
      <div className="hidden md:block rounded-md border shadow-sm max-h-[60vh] overflow-auto relative">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-[40px] text-center font-semibold whitespace-nowrap">*</TableHead>
              <TableHead className="text-center font-semibold whitespace-nowrap">{t('CurrencyManager.headerActions')}</TableHead>
              <TableHead className={cn("font-semibold min-w-[150px] whitespace-nowrap")}><SortableHeader columnKey="name" label={t('CurrencyManager.headerName')} /></TableHead>
              <TableHead className={cn("font-semibold whitespace-nowrap")}><SortableHeader columnKey="code" label={t('CurrencyManager.headerCode')} /></TableHead>
              <TableHead className={cn("text-center font-semibold whitespace-nowrap")}><SortableHeader columnKey="symbol" label={t('CurrencyManager.headerSymbol')} /></TableHead>
              <TableHead className={cn("text-center font-semibold whitespace-nowrap")}><SortableHeader columnKey="decimalPlaces" label={t('CurrencyManager.headerDecimalPlaces')} /></TableHead>
              <TableHead className={cn("text-center font-semibold whitespace-nowrap")}><SortableHeader columnKey="isEnabled" label={t('CurrencyManager.headerEnabled')} /></TableHead>
              <TableHead className={cn("text-center font-semibold whitespace-nowrap")}><SortableHeader columnKey="isDefault" label={t('CurrencyManager.headerDefault')} /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currencies.map((currency, index) => (
              <TableRow key={currency.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="text-center font-mono text-xs">{index + 1}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onEditCurrency(currency)} aria-label={t('CurrencyManager.editActionLabel', { currencyName: currency.name })} disabled={!hasPermission('manage_currencies_page')}>
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{t('CurrencyManager.editActionLabel', { currencyName: currency.name })}</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteCurrency(currency)} aria-label={t('CurrencyManager.deleteActionLabel', { currencyName: currency.name })} disabled={!hasPermission('manage_currencies_page')}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{t('CurrencyManager.deleteActionLabel', { currencyName: currency.name })}</p></TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
                <TableCell className="font-medium whitespace-nowrap">{currency.name}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs">{currency.code}</TableCell>
                <TableCell className="text-center whitespace-nowrap">{currency.symbol}</TableCell>
                <TableCell className="text-center whitespace-nowrap">{currency.decimalPlaces}</TableCell>
                <TableCell className="text-center">
                  <Switch checked={currency.isEnabled} onCheckedChange={(checked) => onToggleEnable(currency, checked)} aria-label={t(currency.isEnabled ? 'CurrencyManager.disableAriaLabel' : 'CurrencyManager.enableAriaLabel', { currencyName: currency.name })} />
                </TableCell>
                <TableCell className="text-center">
                   {currency.isDefault ? (
                      <Badge variant="default" className="flex items-center justify-center gap-1 w-fit mx-auto whitespace-nowrap">
                          <CheckCircle2 className="h-4 w-4"/> {t('CurrencyManager.isDefaultBadge')}
                      </Badge>
                   ) : (
                      <Button variant="outline" size="sm" onClick={() => onSetDefault(currency.id)} disabled={!currency.isEnabled} aria-label={t('CurrencyManager.setDefaultAriaLabel', { currencyName: currency.name })} className="whitespace-nowrap">
                          <CircleDot className="mr-2 h-4 w-4"/> {t('CurrencyManager.setDefaultButton')}
                      </Button>
                   )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
