'use client';

import { useEffect } from 'react';
import type { Promotion, PromotionCondition } from '@/types';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, ArrowUpAZ, ArrowDownAZ, ChevronsUpDown, MoreVertical, Layers, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';


const PromotionCard = ({ promotion, onEditPromotion, onDeletePromotion, t, formatDate, formatDiscount }: { promotion: Promotion, onEditPromotion: (id: string) => void, onDeletePromotion: (id: string) => void, t: Function, formatDate: (d?: string) => string, formatDiscount: (p: Promotion) => string }) => {
  return (
    <Card className="mb-2">
      <CardHeader className="p-4 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">{promotion.name}</CardTitle>
          <CardDescription>{promotion.description}</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditPromotion(promotion.id)}><Pencil className="mr-2 h-4 w-4" /> {t('Common.edit')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDeletePromotion(promotion.id)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> {t('Common.delete')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-2 text-sm px-4 pb-4">
        <div className="flex justify-between items-center"><span className="text-muted-foreground">{t('PromotionListTable.headerDiscount')}:</span> <Badge variant="secondary">{formatDiscount(promotion)}</Badge></div>
        <div className="flex justify-between items-center"><span className="text-muted-foreground">{t('PromotionListTable.headerDates')}:</span> <span>{formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}</span></div>
        <div className="flex justify-between items-center"><span className="text-muted-foreground">{t('PromotionListTable.headerStatus')}:</span> <Badge variant={promotion.isActive ? 'default' : 'destructive'}>{promotion.isActive ? t('PromotionListTable.statusActive') : t('PromotionListTable.statusInactive')}</Badge></div>
      </CardContent>
    </Card>
  );
};


interface PromotionListTableProps {
  promotions: Promotion[];
  onEditPromotion: (promotionId: string) => void;
  onDeletePromotion: (promotionId: string) => void;
  onSort: (key: keyof Promotion | string, direction: 'asc' | 'desc' | null) => void;
  currentSortKey?: keyof Promotion | string | null;
  currentSortDirection?: 'asc' | 'desc' | null;
}

export default function PromotionListTable({ 
  promotions, 
  onEditPromotion, 
  onDeletePromotion,
  onSort,
  currentSortKey,
  currentSortDirection 
}: PromotionListTableProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  if (isLoadingTranslations && (!promotions || promotions.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!promotions || promotions.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{t('PromotionListTable.noPromotionsMessage')}</p>;
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('PromotionListTable.noEndDate');
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch (e) {
      return dateString; 
    }
  };

  const formatDiscount = (promotion: Promotion) => {
    let suffix = '';
    if (promotion.applicationMethod === 'lowestPriceItem') {
      suffix = ` (${t('AddPromotionDialog.applyToLowestPriceItemShort')})`;
    }
    if (promotion.discountType === 'percentage') {
      return t('PromotionListTable.valuePercentage', { value: promotion.discountValue }) + suffix;
    }
    return t('PromotionListTable.valueFixed', { value: promotion.discountValue.toFixed(2) }) + suffix;
  };

  const formatCondition = (condition: PromotionCondition): string => {
    switch (condition.type) {
      case 'minSellAmount':
        return t('PromotionListTable.condMinSellAmount', { amount: (condition.value as number)?.toFixed(2) || '0.00' });
      case 'clientIds':
        return t('PromotionListTable.condClientIds', { count: condition.values?.length || 0 });
      case 'productIds':
        return t('PromotionListTable.condProductIds', { count: condition.values?.length || 0 });
      case 'productCategories':
        return t('PromotionListTable.condProductCategories', { list: condition.values?.join(', ') || t('PromotionListTable.any') });
      case 'paymentMethods':
        return t('PromotionListTable.condPaymentMethods', { list: condition.values?.join(', ') || t('PromotionListTable.any') });
      case 'itemQuantity':
        return t('PromotionListTable.condItemQuantity', { count: condition.value as number });
      default:
        const exhaustiveCheck: never = condition.type; 
        return exhaustiveCheck;
    }
  };

  const renderApplicability = (conditions: PromotionCondition[]) => {
    if (!conditions || conditions.length === 0) {
      return <Badge variant="outline" className="whitespace-nowrap">{t('PromotionListTable.noSpecificApplicability')}</Badge>;
    }
    const formattedConditions = conditions.map(formatCondition).join('; ');

    if (formattedConditions.length > 50) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="truncate cursor-default whitespace-nowrap">{formattedConditions.substring(0, 50)}...</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs break-words">
                        <p>{formattedConditions}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
    return <span className="text-xs whitespace-nowrap">{formattedConditions}</span>;
  };

  const SortableHeader = ({ columnKey, label }: { columnKey: keyof Promotion | string, label: string }) => {
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
    <TooltipProvider>
      <div className="md:hidden">
        {promotions.map(promo => (
          <PromotionCard
            key={promo.id}
            promotion={promo}
            onEditPromotion={onEditPromotion}
            onDeletePromotion={onDeletePromotion}
            t={t}
            formatDate={formatDate}
            formatDiscount={formatDiscount}
          />
        ))}
      </div>
      <div className="hidden md:block rounded-md border shadow-sm max-h-[60vh] overflow-auto relative">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-[40px] text-center font-semibold whitespace-nowrap">*</TableHead>
              <TableHead className="text-center font-semibold whitespace-nowrap">{t('PromotionListTable.headerActions')}</TableHead>
              <TableHead className={cn("font-semibold min-w-[150px] whitespace-nowrap")}><SortableHeader columnKey="name" label={t('PromotionListTable.headerName')} /></TableHead>
              <TableHead className={cn("font-semibold whitespace-nowrap")}><SortableHeader columnKey="discountValue" label={t('PromotionListTable.headerDiscount')} /></TableHead> 
              <TableHead className={cn("font-semibold min-w-[180px] whitespace-nowrap")}><SortableHeader columnKey="startDate" label={t('PromotionListTable.headerDates')} /></TableHead>
              <TableHead className={cn("font-semibold min-w-[200px] whitespace-nowrap")}>{t('PromotionListTable.headerApplicability')}</TableHead> 
              <TableHead className={cn("text-center font-semibold whitespace-nowrap")}><SortableHeader columnKey="isActive" label={t('PromotionListTable.headerStatus')} /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promotions.map((promo, index) => (
              <TableRow key={promo.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="text-center font-mono text-xs">{index + 1}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEditPromotion(promo.id)} aria-label={t('PromotionListTable.editActionLabel', { promotionName: promo.name })}>
                      <Pencil className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDeletePromotion(promo.id)} aria-label={t('PromotionListTable.deleteActionLabel', { promotionName: promo.name })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="font-medium whitespace-nowrap">{promo.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="whitespace-nowrap">{formatDiscount(promo)}</Badge>
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
                </TableCell>
                <TableCell>{renderApplicability(promo.conditions)}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={promo.isActive ? 'default' : 'destructive'} className="whitespace-nowrap">
                    {promo.isActive ? t('PromotionListTable.statusActive') : t('PromotionListTable.statusInactive')}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
