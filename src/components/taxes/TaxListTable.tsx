'use client';

import { useEffect } from 'react';
import type { Tax } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ArrowUpAZ, ArrowDownAZ, ChevronsUpDown, MoreVertical, Layers, Loader2 } from 'lucide-react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface TaxListTableProps {
  taxes: Tax[];
  onEditTax: (taxId: string) => void;
  onDeleteTax: (taxId: string) => void;
  onSort: (key: keyof Tax | string, direction: 'asc' | 'desc' | null) => void;
  currentSortKey?: keyof Tax | string | null;
  currentSortDirection?: 'asc' | 'desc' | null;
}

export default function TaxListTable({ 
  taxes, 
  onEditTax, 
  onDeleteTax,
  onSort,
  currentSortKey,
  currentSortDirection 
}: TaxListTableProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { toast } = useToast();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  if (isLoadingTranslations && (!taxes || taxes.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!taxes || taxes.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{t('TaxListTable.noTaxesMessage')}</p>;
  }

  const SortableHeader = ({ columnKey, label }: { columnKey: keyof Tax | string, label: string }) => {
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
      toast({ title: t('Common.featureComingSoonTitle'), description: `Grouping by ${String(label)} will be available soon.`});
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
      <div className="rounded-md border shadow-sm max-h-[60vh] overflow-auto relative">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-[40px] text-center font-semibold whitespace-nowrap">*</TableHead>
              <TableHead className="text-center font-semibold whitespace-nowrap">{t('TaxListTable.headerActions')}</TableHead>
              <TableHead className={cn("font-semibold min-w-[200px] whitespace-nowrap")}><SortableHeader columnKey="name" label={t('TaxListTable.headerName')} /></TableHead>
              <TableHead className={cn("text-center font-semibold whitespace-nowrap")}><SortableHeader columnKey="rate" label={t('TaxListTable.headerRate')} /></TableHead>
              <TableHead className={cn("font-semibold whitespace-nowrap")}>{t('TaxListTable.headerDescription')}</TableHead> 
            </TableRow>
          </TableHeader>
          <TableBody>
            {taxes.map((tax, index) => (
              <TableRow key={tax.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="text-center font-mono text-xs">{index + 1}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onEditTax(tax.id)} aria-label={t('TaxListTable.editActionLabel', { taxName: tax.name })}>
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{t('TaxListTable.editActionLabel', { taxName: tax.name })}</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteTax(tax.id)} aria-label={t('TaxListTable.deleteActionLabel', { taxName: tax.name })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{t('TaxListTable.deleteActionLabel', { taxName: tax.name })}</p></TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
                <TableCell className="font-medium whitespace-nowrap">{tax.name}</TableCell>
                <TableCell className="text-center whitespace-nowrap">{(tax.rate * 100).toFixed(2)}%</TableCell>
                <TableCell className="whitespace-nowrap">{tax.description || t('TaxListTable.noDescription')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
