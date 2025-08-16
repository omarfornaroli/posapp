

'use client';

import React, { useEffect } from "react";
import Image from 'next/image';
import type { Product as ProductType, ColumnDefinition, SortConfig, GroupedTableItem } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, CheckCircle, XCircle, ArrowUpAZ, ArrowDownAZ, ChevronsUpDown, MoreVertical, Layers, Minus, Plus, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

interface ProductListTableProps {
  processedProducts: Array<ProductType | GroupedTableItem<ProductType>>;
  columnDefinitions: ColumnDefinition<ProductType>[];
  displayColumns: ColumnDefinition<ProductType>[];
  onEditProduct: (productId: string) => void;
  onDeleteProduct: (productId: string) => void;
  onSort: (key: keyof ProductType | string, direction: 'asc' | 'desc' | null) => void;
  currentSortKey?: keyof ProductType | string | null;
  currentSortDirection?: 'asc' | 'desc' | null;
  groupingKeys: string[];
  onToggleGroup: (key: string) => void;
}

export default function ProductListTable({
  processedProducts,
  columnDefinitions,
  displayColumns,
  onEditProduct,
  onDeleteProduct,
  onSort,
  currentSortKey,
  currentSortDirection,
  groupingKeys,
  onToggleGroup
}: ProductListTableProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  if (isLoadingTranslations && (!processedProducts || processedProducts.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!processedProducts || processedProducts.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{t('ProductListTable.noProductsMessage')}</p>;
  }

  const SortableHeader = ({ columnDef }: { columnDef: ColumnDefinition<ProductType> }) => {
    const { key, label, isSortable, isGroupable } = columnDef;
    const isCurrentSortColumn = currentSortKey === key;
    const isCurrentlyGrouped = groupingKeys.includes(String(key));

    const handleSortClick = () => {
      if (!isSortable) return;
      if (isCurrentSortColumn) {
        if (currentSortDirection === 'asc') onSort(key, 'desc');
        else if (currentSortDirection === 'desc') onSort(key, null);
        else onSort(key, 'asc');
      } else {
        onSort(key, 'asc');
      }
    };

    const handleToggleGroupClick = () => {
      if (!isGroupable) return;
      onToggleGroup(String(key));
    };

    let SortIcon = ChevronsUpDown;
    if (isSortable && isCurrentSortColumn) {
      if (currentSortDirection === 'asc') SortIcon = ArrowUpAZ;
      else if (currentSortDirection === 'desc') SortIcon = ArrowDownAZ;
    }

    return (
      <div className={cn("flex items-center group", isSortable || isGroupable ? "justify-between" : "justify-start")}>
        {label}
        {(isSortable || isGroupable) && (
          <div className="flex items-center">
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
            {isGroupable && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className={cn("h-7 w-7 data-[state=open]:bg-accent", isCurrentlyGrouped && "text-primary")} aria-label={t('TableActions.columnActionsMenu', {columnName: label})}>
                    <MoreVertical className="h-4 w-4 opacity-40 group-hover:opacity-100" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleToggleGroupClick} disabled={!isGroupable}>
                    {isCurrentlyGrouped 
                      ? <Minus className="mr-2 h-3.5 w-3.5 text-destructive" /> 
                      : <Plus className="mr-2 h-3.5 w-3.5 text-green-600" />
                    }
                    {isCurrentlyGrouped ? t('TableActions.removeFromGrouping') : t('TableActions.addToGrouping')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCellContent = (product: ProductType, columnKey: keyof ProductType | string) => {
    const columnDef = columnDefinitions.find(def => def.key === columnKey);
    if (columnDef?.render) {
      return columnDef.render(product);
    }
    const value = product[columnKey as keyof ProductType];
    if (columnKey === 'imageUrl' && typeof value === 'string') {
      return (
        <Image
          src={value || 'https://placehold.co/64x64.png'}
          alt={product.name}
          width={40}
          height={40}
          className="rounded object-cover aspect-square"
          data-ai-hint={product.category}
        />
      );
    }
    if (columnKey === 'category' && typeof value === 'string') {
      return <Badge variant="secondary" className="whitespace-nowrap">{value}</Badge>;
    }
    if (columnKey === 'productGroup' && typeof value === 'string') {
      return <Badge variant="outline" className="whitespace-nowrap">{value}</Badge>;
    }
    if (columnKey === 'price' && typeof value === 'number') return `$${value.toFixed(2)}`;
    if (columnKey === 'isEnabled' && typeof value === 'boolean') {
      return value ? <CheckCircle className="h-5 w-5 text-green-500 mx-auto" /> : <XCircle className="h-5 w-5 text-destructive mx-auto" />;
    }
    if (value === undefined || value === null || value === '') return <span className="text-muted-foreground">{t('ProductListTable.na')}</span>;
    return String(value);
  };

  const RenderGroupedRows: React.FC<{
    items: Array<ProductType | GroupedTableItem<ProductType>>;
    level: number;
    rowIndexOffset: number;
  }> = ({ items, level, rowIndexOffset }) => {
    let currentProductIndex = rowIndexOffset;
    return (
      <>
        {items.map((itemOrGroup, index) => {
          if ('isGroupHeader' in itemOrGroup && itemOrGroup.isGroupHeader) {
            const groupLabel = columnDefinitions.find(c => c.key === itemOrGroup.groupKey)?.label || itemOrGroup.groupKey;
            return (
              <React.Fragment key={`group-${itemOrGroup.groupKey}-${itemOrGroup.groupValue}-${level}-${index}`}>
                <TableRow className="bg-muted/60 hover:bg-muted/80">
                  <TableCell
                    colSpan={displayColumns.length + 2}
                    className="py-2 px-4 font-semibold text-primary"
                    style={{ paddingLeft: `${level + 1}rem` }}
                  >
                    {t('ProductListTable.groupHeaderValue', { groupName: groupLabel, value: itemOrGroup.groupValue })}
                  </TableCell>
                </TableRow>
                <RenderGroupedRows items={itemOrGroup.items} level={level + 1} rowIndexOffset={currentProductIndex} />
              </React.Fragment>
            );
          } else {
            const product = itemOrGroup as ProductType;
            currentProductIndex++;
            return (
              <TableRow key={product.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="text-center font-mono text-xs">{currentProductIndex}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEditProduct(product.id)} aria-label={t('ProductListTable.editActionLabel', { productName: product.name })}>
                      <Pencil className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDeleteProduct(product.id)} aria-label={t('ProductListTable.deleteActionLabel', { productName: product.name })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
                {displayColumns.map((col) => (
                  <TableCell key={String(col.key)} className={cn("whitespace-nowrap", col.className)}>
                    {renderCellContent(product, col.key)}
                  </TableCell>
                ))}
              </TableRow>
            );
          }
        })}
      </>
    );
  };

  return (
    <div className="rounded-md border shadow-sm max-h-[60vh] overflow-auto relative">
      <Table>
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow>
            <TableHead className="w-[40px] text-center font-semibold whitespace-nowrap">*</TableHead>
            <TableHead className="text-center font-semibold whitespace-nowrap">{t('ProductListTable.headerActions')}</TableHead>
            {displayColumns.map((colDef) => (
              <TableHead key={String(colDef.key)} className={cn("font-semibold whitespace-nowrap", colDef.className)}>
                <SortableHeader columnDef={colDef} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          <RenderGroupedRows items={processedProducts} level={0} rowIndexOffset={0} />
        </TableBody>
      </Table>
    </div>
  );
}
