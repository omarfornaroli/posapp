
'use client';

import { useEffect } from 'react';
import type { AppLanguage } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AppLanguageListTableProps {
  languages: AppLanguage[];
  onEditLanguage: (language: AppLanguage) => void;
  onDeleteLanguage: (language: AppLanguage) => void;
  onToggleEnable: (language: AppLanguage, isEnabled: boolean) => void;
  onSetDefault: (languageId: string) => void;
  onSort: (key: keyof AppLanguage | string, direction: 'asc' | 'desc' | null) => void;
  currentSortKey?: keyof AppLanguage | string | null;
  currentSortDirection?: 'asc' | 'desc' | null;
}

export default function AppLanguageListTable({
  languages,
  onEditLanguage,
  onDeleteLanguage,
  onToggleEnable,
  onSetDefault,
  onSort,
  currentSortKey,
  currentSortDirection,
}: AppLanguageListTableProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { toast } = useToast();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  if (isLoadingTranslations && (!languages || languages.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!languages || languages.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{t('AppLanguageListTable.noLanguagesMessage')}</p>;
  }

  const SortableHeader = ({ columnKey, label }: { columnKey: keyof AppLanguage | string, label: string }) => {
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
      <ScrollArea className="rounded-md border shadow-sm">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead className="w-[40px] text-center font-semibold whitespace-nowrap">*</TableHead>
              <TableHead className="text-center font-semibold whitespace-nowrap">{t('AppLanguageListTable.headerActions')}</TableHead>
              <TableHead className={cn("font-semibold min-w-[150px] whitespace-nowrap")}><SortableHeader columnKey="name" label={t('AppLanguageListTable.headerName')} /></TableHead>
              <TableHead className={cn("font-semibold whitespace-nowrap")}><SortableHeader columnKey="code" label={t('AppLanguageListTable.headerCode')} /></TableHead>
              <TableHead className={cn("text-center font-semibold whitespace-nowrap")}><SortableHeader columnKey="isEnabled" label={t('AppLanguageListTable.headerEnabled')} /></TableHead>
              <TableHead className={cn("text-center font-semibold whitespace-nowrap")}><SortableHeader columnKey="isDefault" label={t('AppLanguageListTable.headerDefault')} /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {languages.map((lang, index) => (
              <TableRow key={lang.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="text-center font-mono text-xs">{index + 1}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onEditLanguage(lang)} aria-label={t('AppLanguageListTable.editActionLabel', { langName: lang.name })}><Pencil className="h-4 w-4 text-blue-500" /></Button></TooltipTrigger><TooltipContent><p>{t('AppLanguageListTable.editActionLabel', { langName: lang.name })}</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => onDeleteLanguage(lang)} aria-label={t('AppLanguageListTable.deleteActionLabel', { langName: lang.name })}><Trash2 className="h-4 w-4 text-destructive" /></Button></TooltipTrigger><TooltipContent><p>{t('AppLanguageListTable.deleteActionLabel', { langName: lang.name })}</p></TooltipContent></Tooltip>
                  </div>
                </TableCell>
                <TableCell className="font-medium whitespace-nowrap">{lang.name}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs">{lang.code}</TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={lang.isEnabled}
                    onCheckedChange={(checked) => onToggleEnable(lang, checked)}
                    aria-label={t(lang.isEnabled ? 'AppLanguageListTable.disableAriaLabel' : 'AppLanguageListTable.enableAriaLabel', { langName: lang.name })}
                  />
                </TableCell>
                <TableCell className="text-center">
                  {lang.isDefault ? (
                      <Badge variant="default" className="flex items-center justify-center gap-1 w-fit mx-auto whitespace-nowrap">
                          <CheckCircle2 className="h-4 w-4"/> {t('AppLanguageListTable.isDefaultBadge')}
                      </Badge>
                  ) : (
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSetDefault(lang.id)}
                          disabled={!lang.isEnabled}
                          aria-label={t('AppLanguageListTable.setDefaultAriaLabel', { langName: lang.name })}
                          className="whitespace-nowrap"
                      >
                          <CircleDot className="mr-2 h-4 w-4"/> {t('AppLanguageListTable.setDefaultButton')}
                      </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </TooltipProvider>
  );
}
