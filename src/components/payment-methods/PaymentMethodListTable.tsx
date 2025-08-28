
'use client';

import { useEffect, useMemo } from 'react';
import type { PaymentMethod, ColumnDefinition } from '@/types';
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

const PaymentMethodCard = ({ method, onEditPaymentMethod, onDeletePaymentMethod, onToggleEnable, onSetDefault, t, hasPermission, currentLocale }: { method: PaymentMethod, onEditPaymentMethod: (id: string) => void, onDeletePaymentMethod: (id: string) => void, onToggleEnable: (m: PaymentMethod, e: boolean) => void, onSetDefault: (id: string) => void, t: Function, hasPermission: (p: any) => boolean, currentLocale: string }) => (
    <Card className="mb-2">
      <CardHeader className="p-4 flex flex-row items-start justify-between">
        <div>
            <CardTitle className="text-base">{method.name[currentLocale] || method.name['en']}</CardTitle>
            <CardDescription>{method.description?.[currentLocale] || method.description?.['en']}</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2" disabled={!hasPermission('manage_payment_methods_page')}><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditPaymentMethod(method.id)} disabled={!hasPermission('manage_payment_methods_page')}><Pencil className="mr-2 h-4 w-4" /> {t('Common.edit')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDeletePaymentMethod(method.id)} disabled={!hasPermission('manage_payment_methods_page')} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> {t('Common.delete')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardFooter className="px-4 pb-4 flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
            <Switch checked={method.isEnabled} onCheckedChange={(checked) => onToggleEnable(method, checked)} id={`switch-mob-${method.id}`} aria-label={t(method.isEnabled ? 'PaymentMethodListTable.disableAriaLabel' : 'PaymentMethodListTable.enableAriaLabel', { methodName: method.name[currentLocale] || method.name['en'] })} />
            <label htmlFor={`switch-mob-${method.id}`}>{t('PaymentMethodListTable.headerEnabled')}</label>
        </div>
        <Button size="sm" variant="outline" onClick={() => onSetDefault(method.id)} disabled={!method.isEnabled || method.isDefault}>{method.isDefault ? t('PaymentMethodListTable.isDefaultBadge') : t('PaymentMethodListTable.setDefaultButton')}</Button>
      </CardFooter>
    </Card>
);

interface PaymentMethodListTableProps {
  paymentMethods: PaymentMethod[];
  onEditPaymentMethod: (methodId: string) => void;
  onDeletePaymentMethod: (methodId: string) => void;
  onToggleEnable: (method: PaymentMethod, isEnabled: boolean) => void;
  onSetDefault: (methodId: string) => void;
  onSort: (key: keyof PaymentMethod | string, direction: 'asc' | 'desc' | null) => void;
  currentSortKey?: keyof PaymentMethod | string | null;
  currentSortDirection?: 'asc' | 'desc' | null;
}

export default function PaymentMethodListTable({
  paymentMethods,
  onEditPaymentMethod,
  onDeletePaymentMethod,
  onToggleEnable,
  onSetDefault,
  onSort,
  currentSortKey,
  currentSortDirection
}: PaymentMethodListTableProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const columnDefinitions: ColumnDefinition<PaymentMethod>[] = useMemo(() => [
    { key: 'name', label: t('PaymentMethodListTable.headerName'), isSortable: true, className: "min-w-[150px] whitespace-nowrap" },
    { key: 'description', label: t('PaymentMethodListTable.headerDescription'), isSortable: false, className: "whitespace-nowrap" },
    { key: 'isEnabled', label: t('PaymentMethodListTable.headerEnabled'), isSortable: true, className: "text-center" },
    { key: 'isDefault', label: t('PaymentMethodListTable.headerDefault'), isSortable: true, className: "text-center" },
  ], [t]);

  if (isLoadingTranslations && (!paymentMethods || paymentMethods.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!paymentMethods || paymentMethods.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{t('PaymentMethodListTable.noPaymentMethodsMessage')}</p>;
  }

  const renderCellContent = (method: PaymentMethod, columnKey: keyof PaymentMethod | string) => {
    const value = method[columnKey as keyof PaymentMethod];

    switch (columnKey) {
        case 'name':
        case 'description':
            const multiLangValue = value as Record<string, string> | undefined;
            return multiLangValue?.[currentLocale] || multiLangValue?.['en'] || (columnKey === 'description' ? t('PaymentMethodListTable.noDescription') : '');
        case 'isEnabled':
            return (
                <Switch
                    checked={!!value}
                    onCheckedChange={(checked) => onToggleEnable(method, checked)}
                    aria-label={t(!!value ? 'PaymentMethodListTable.disableAriaLabel' : 'PaymentMethodListTable.enableAriaLabel', { methodName: method.name[currentLocale] || method.name['en'] })}
                  />
            );
        case 'isDefault':
            return value ? (
                <Badge variant="default" className="flex items-center justify-center gap-1 w-fit mx-auto whitespace-nowrap">
                    <CheckCircle2 className="h-4 w-4"/> {t('PaymentMethodListTable.isDefaultBadge')}
                </Badge>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSetDefault(method.id)}
                    disabled={!method.isEnabled}
                    aria-label={t('PaymentMethodListTable.setDefaultAriaLabel', { methodName: method.name[currentLocale] || method.name['en'] })}
                    className="whitespace-nowrap"
                >
                    <CircleDot className="mr-2 h-4 w-4"/> {t('PaymentMethodListTable.setDefaultButton')}
                </Button>
            );
        default:
            return String(value ?? '');
    }
  };

  const SortableHeader = ({ columnDef }: { columnDef: ColumnDefinition<PaymentMethod> }) => {
    const { key, label, isSortable } = columnDef;
    const isCurrentSortColumn = currentSortKey === key;

    const handleSortClick = () => {
      if (!isSortable) return;
      if (isCurrentSortColumn) {
        onSort(key, currentSortDirection === 'asc' ? 'desc' : currentSortDirection === 'desc' ? null : 'asc');
      } else {
        onSort(key, 'asc');
      }
    };
    
    let SortIcon = ChevronsUpDown;
    if (isCurrentSortColumn) {
      SortIcon = currentSortDirection === 'asc' ? ArrowUpAZ : ArrowDownAZ;
    }

    return (
      <div className="flex items-center justify-between group">
        {label}
        {isSortable && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSortClick}
            className="h-7 w-7 ml-2 data-[state=open]:bg-accent"
            aria-label={t('TableActions.cycleSortOrder', { columnName: label })}
          >
            <SortIcon className="h-4 w-4 opacity-40 group-hover:opacity-100" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
       <div className="md:hidden">
        {paymentMethods.map(method => (
          <PaymentMethodCard
            key={method.id}
            method={method}
            onEditPaymentMethod={onEditPaymentMethod}
            onDeletePaymentMethod={onDeletePaymentMethod}
            onToggleEnable={onToggleEnable}
            onSetDefault={onSetDefault}
            t={t}
            hasPermission={hasPermission}
            currentLocale={currentLocale}
          />
        ))}
      </div>
      <div className="hidden md:block rounded-md border shadow-sm max-h-[60vh] overflow-auto relative">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
                <TableHead className="w-[40px] text-center font-semibold whitespace-nowrap">*</TableHead>
                <TableHead className="text-center font-semibold whitespace-nowrap">{t('PaymentMethodListTable.headerActions')}</TableHead>
                {columnDefinitions.map(colDef => (
                     <TableHead key={String(colDef.key)} className={cn("font-semibold", colDef.className)}>
                        <SortableHeader columnDef={colDef} />
                    </TableHead>
                ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentMethods.map((method, index) => (
              <TableRow key={method.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="text-center font-mono text-xs">{index + 1}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onEditPaymentMethod(method.id)} aria-label={t('PaymentMethodListTable.editActionLabel', { methodName: method.name[currentLocale] || method.name['en'] })}>
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{t('PaymentMethodListTable.editActionLabel', { methodName: method.name[currentLocale] || method.name['en'] })}</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onDeletePaymentMethod(method.id)} aria-label={t('PaymentMethodListTable.deleteActionLabel', { methodName: method.name[currentLocale] || method.name['en'] })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{t('PaymentMethodListTable.deleteActionLabel', { methodName: method.name[currentLocale] || method.name['en'] })}</p></TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
                {columnDefinitions.map(colDef => (
                    <TableCell key={String(colDef.key)} className={cn(colDef.className)}>
                        {renderCellContent(method, colDef.key)}
                    </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
