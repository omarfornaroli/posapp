

'use client';

import { useEffect } from 'react';
import type { PaymentMethod } from '@/types';
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

  const SortableHeader = ({ columnKey, label }: { columnKey: keyof PaymentMethod | string, label: string }) => {
    const isCurrentSortColumn = currentSortKey === columnKey;

    const handleSortClick = () => {
      if (isCurrentSortColumn) {
        if (currentSortDirection === 'asc') {
          onSort(columnKey, 'desc');
        } else if (currentSortDirection === 'desc') {
          onSort(columnKey, null);
        } else {
          onSort(columnKey, 'asc');
        }
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
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSortClick}
            className="h-7 w-7 ml-2 data-[state=open]:bg-accent"
            aria-label={t('TableActions.cycleSortOrder', { columnName: label })}
          >
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
            <TableRow><TableHead className="w-[40px] text-center font-semibold whitespace-nowrap">*</TableHead><TableHead className="text-center font-semibold whitespace-nowrap">{t('PaymentMethodListTable.headerActions')}</TableHead><TableHead className={cn("font-semibold min-w-[150px] whitespace-nowrap")}><SortableHeader columnKey="name" label={t('PaymentMethodListTable.headerName')} /></TableHead><TableHead className={cn("font-semibold whitespace-nowrap")}>{t('PaymentMethodListTable.headerDescription')}</TableHead><TableHead className={cn("text-center font-semibold whitespace-nowrap")}><SortableHeader columnKey="isEnabled" label={t('PaymentMethodListTable.headerEnabled')} /></TableHead><TableHead className={cn("text-center font-semibold whitespace-nowrap")}><SortableHeader columnKey="isDefault" label={t('PaymentMethodListTable.headerDefault')} /></TableHead></TableRow>
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
                <TableCell className="font-medium whitespace-nowrap">{method.name[currentLocale] || method.name['en']}</TableCell>
                <TableCell className="whitespace-nowrap">{method.description?.[currentLocale] || method.description?.['en'] || t('PaymentMethodListTable.noDescription')}</TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={method.isEnabled}
                    onCheckedChange={(checked) => onToggleEnable(method, checked)}
                    aria-label={t(method.isEnabled ? 'PaymentMethodListTable.disableAriaLabel' : 'PaymentMethodListTable.enableAriaLabel', { methodName: method.name[currentLocale] || method.name['en'] })}
                  />
                </TableCell>
                <TableCell className="text-center">
                   {method.isDefault ? (
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
