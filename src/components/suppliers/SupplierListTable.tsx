
'use client';

import type { Supplier, ColumnDefinition, GroupedTableItem } from '@/types';
import React, { useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ArrowUpAZ, ArrowDownAZ, ChevronsUpDown, MoreVertical, Layers, Loader2, Minus, Plus, CheckCircle, XCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, getInitials } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const SupplierCard = ({ supplier, onEditSupplier, onDeleteSupplier, t, hasPermission }: { supplier: Supplier, onEditSupplier: (s: Supplier) => void, onDeleteSupplier: (s: Supplier) => void, t: (key: string, params?: any) => string, hasPermission: (p: any) => boolean }) => {
  return (
    <Card className="mb-2">
      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12"><AvatarFallback>{getInitials(supplier.name)}</AvatarFallback></Avatar>
            <div>
              <CardTitle className="text-base">{supplier.name}</CardTitle>
              <CardDescription>{supplier.contactPerson || t('SupplierListTable.na')}</CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2" disabled={!hasPermission('manage_suppliers_page')}><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditSupplier(supplier)} disabled={!hasPermission('manage_suppliers_page')}>
                <Pencil className="mr-2 h-4 w-4" /> {t('Common.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDeleteSupplier(supplier)} disabled={!hasPermission('manage_suppliers_page')} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> {t('Common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm px-4 pb-4">
        {supplier.email && <div className="flex justify-between items-center"><span className="text-muted-foreground">{t('SupplierListTable.headerEmail')}:</span> <span>{supplier.email}</span></div>}
        {supplier.phone && <div className="flex justify-between items-center"><span className="text-muted-foreground">{t('SupplierListTable.headerPhone')}:</span> <span>{supplier.phone}</span></div>}
      </CardContent>
      <CardFooter className="px-4 pb-4">
         <div className="flex justify-between items-center w-full">
            <span className="text-sm text-muted-foreground">{t('SupplierListTable.headerEnabled')}:</span>
            {supplier.isEnabled ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
        </div>
      </CardFooter>
    </Card>
  );
};


interface SupplierListTableProps {
  suppliers: Array<Supplier | GroupedTableItem<Supplier>>;
  displayColumns: ColumnDefinition<Supplier>[];
  columnDefinitions: ColumnDefinition<Supplier>[];
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplier: Supplier) => void;
  onSort: (key: keyof Supplier | string, direction: 'asc' | 'desc' | null) => void;
  currentSortKey?: keyof Supplier | string | null;
  currentSortDirection?: 'asc' | 'desc' | null;
  groupingKeys: string[];
  onToggleGroup: (key: string) => void;
}

export default function SupplierListTable({ 
  suppliers, 
  displayColumns,
  columnDefinitions,
  onEditSupplier, 
  onDeleteSupplier,
  onSort,
  currentSortKey,
  currentSortDirection,
  groupingKeys,
  onToggleGroup
}: SupplierListTableProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const renderCellContent = (supplier: Supplier, columnKey: keyof Supplier | string) => {
    const value = supplier[columnKey as keyof Supplier];
    if (columnKey === 'isEnabled') {
      return value ? <CheckCircle className="h-5 w-5 text-green-500 mx-auto" /> : <XCircle className="h-5 w-5 text-destructive mx-auto" />;
    }
    return supplier[columnKey as keyof Supplier] || t('SupplierListTable.na');
  };

  const SortableHeader = ({ columnDef }: { columnDef: ColumnDefinition<Supplier> }) => {
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
  
  const RenderDesktopRows: React.FC<{ items: Array<Supplier | GroupedTableItem<Supplier>>, level: number }> = ({ items, level }) => {
    return (
      <>
        {items.map((item, index) => {
          if ('isGroupHeader' in item) {
            const groupDef = columnDefinitions.find(c => c.key === item.groupKey);
            return (
              <React.Fragment key={`group-${item.groupKey}-${item.groupValue}`}>
                <TableRow className="bg-muted/60 hover:bg-muted/80">
                  <TableCell colSpan={displayColumns.length + 2} className="py-2 font-semibold text-primary" style={{ paddingLeft: `${level * 1.5 + 1}rem` }}>
                    {groupDef?.label || item.groupKey}: {item.groupValue}
                  </TableCell>
                </TableRow>
                <RenderDesktopRows items={item.items} level={level + 1} />
              </React.Fragment>
            );
          }
          const supplier = item as Supplier;
          return (
            <TableRow key={supplier.id} className="hover:bg-muted/50 transition-colors">
              <TableCell className="text-center font-mono text-xs" style={{ paddingLeft: `${level * 1.5 + 1}rem` }}>
                <Avatar className="h-9 w-9 mx-auto"><AvatarFallback>{getInitials(supplier.name)}</AvatarFallback></Avatar>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center gap-1">
                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onEditSupplier(supplier)} disabled={!hasPermission('manage_suppliers_page')}><Pencil className="h-4 w-4 text-blue-500" /></Button></TooltipTrigger><TooltipContent><p>{t('SupplierListTable.editActionLabel', { supplierName: supplier.name })}</p></TooltipContent></Tooltip>
                  <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onDeleteSupplier(supplier)} disabled={!hasPermission('manage_suppliers_page')}><Trash2 className="h-4 w-4 text-destructive" /></Button></TooltipTrigger><TooltipContent><p>{t('SupplierListTable.deleteActionLabel', { supplierName: supplier.name })}</p></TooltipContent></Tooltip>
                </div>
              </TableCell>
              {displayColumns.map(col => (
                <TableCell key={String(col.key)} className={cn("whitespace-nowrap", col.className)}>
                  {renderCellContent(supplier, col.key)}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </>
    );
  };
  
  const RenderMobileCards: React.FC<{ items: Array<Supplier | GroupedTableItem<Supplier>> }> = ({ items }) => (
    <>
      {items.map((item) => {
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
        const supplier = item as Supplier;
        return (
          <SupplierCard 
            key={supplier.id}
            supplier={supplier}
            onEditSupplier={onEditSupplier}
            onDeleteSupplier={onDeleteSupplier}
            getInitials={getInitials}
            t={t}
            hasPermission={hasPermission}
          />
        );
      })}
    </>
  );

  
  if (isLoadingTranslations && suppliers.length === 0) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (!suppliers || suppliers.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{t('SupplierListTable.noSuppliersMessage')}</p>;
  }

  return (
    <TooltipProvider delayDuration={100}>
       <div className="md:hidden">
        <RenderMobileCards items={suppliers} />
      </div>
      <div className="hidden md:block rounded-md border shadow-sm max-h-[60vh] overflow-auto relative">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-[60px] font-semibold whitespace-nowrap">{t('SupplierListTable.headerAvatar')}</TableHead>
              <TableHead className="text-center font-semibold whitespace-nowrap">{t('SupplierListTable.headerActions')}</TableHead>
              {displayColumns.map(col => (
                <TableHead key={String(col.key)} className={cn("font-semibold min-w-[150px] whitespace-nowrap", col.className)}>
                  <SortableHeader columnDef={col} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody><RenderDesktopRows items={suppliers} level={0} /></TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
