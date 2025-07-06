'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import type { Country } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, CheckCircle2, CircleDot, ArrowUpAZ, ArrowDownAZ, ChevronsUpDown, MoreVertical, Layers, Globe, Loader2 } from 'lucide-react';
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


const CountryCard = ({ country, onEditCountry, onDeleteCountry, onToggleEnable, onSetDefault, t, hasPermission }: { country: Country, onEditCountry: (c: Country) => void, onDeleteCountry: (c: Country) => void, onToggleEnable: (c: Country, e: boolean) => void, onSetDefault: (id: string) => void, t: Function, hasPermission: (p: any) => boolean }) => {
  const getFlagUrl = (codeAlpha2: string) => `https://flagcdn.com/w40/${codeAlpha2.toLowerCase()}.png`;

  return (
    <Card className="mb-2">
      <CardHeader className="p-4 flex flex-row items-start justify-between">
        <div className="flex items-center gap-4">
          {country.flagImageUrl || country.codeAlpha2 ? (
            <Image src={country.flagImageUrl || getFlagUrl(country.codeAlpha2)} alt={country.name} width={40} height={26} className="rounded-sm object-contain border" data-ai-hint="country flag" onError={(e) => (e.currentTarget.style.display = 'none')} />
          ) : <Globe className="h-7 w-7 text-muted-foreground" />}
          <div>
            <CardTitle className="text-base">{country.name}</CardTitle>
            <CardDescription>{country.codeAlpha2} / {country.currencyCode || 'N/A'}</CardDescription>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2" disabled={!hasPermission('manage_countries_page')}><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditCountry(country)} disabled={!hasPermission('manage_countries_page')}><Pencil className="mr-2 h-4 w-4" /> {t('Common.edit')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDeleteCountry(country)} disabled={!hasPermission('manage_countries_page')} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> {t('Common.delete')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardFooter className="px-4 pb-4 flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
            <Switch checked={country.isEnabled} onCheckedChange={(checked) => onToggleEnable(country, checked)} id={`switch-mob-${country.id}`} aria-label={t(country.isEnabled ? 'CountryListTable.disableAriaLabel' : 'CountryListTable.enableAriaLabel', { countryName: country.name })} />
            <label htmlFor={`switch-mob-${country.id}`}>{t('CountryListTable.headerEnabled')}</label>
        </div>
        <Button size="sm" variant="outline" onClick={() => onSetDefault(country.id)} disabled={!country.isEnabled || country.isDefault}>{country.isDefault ? t('CountryListTable.isDefaultBadge') : t('CountryListTable.setDefaultButton')}</Button>
      </CardFooter>
    </Card>
  );
};

interface CountryListTableProps {
  countries: Country[];
  onEditCountry: (country: Country) => void;
  onDeleteCountry: (country: Country) => void;
  onToggleEnable: (country: Country, isEnabled: boolean) => void;
  onSetDefault: (countryId: string) => void;
  onSort: (key: keyof Country | string, direction: 'asc' | 'desc' | null) => void;
  currentSortKey?: keyof Country | string | null;
  currentSortDirection?: 'asc' | 'desc' | null;
}

export default function CountryListTable({
  countries,
  onEditCountry,
  onDeleteCountry,
  onToggleEnable,
  onSetDefault,
  onSort,
  currentSortKey,
  currentSortDirection
}: CountryListTableProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  if (isLoadingTranslations && (!countries || countries.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!countries || countries.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{t('CountryListTable.noCountriesMessage')}</p>;
  }

  const SortableHeader = ({ columnKey, label }: { columnKey: keyof Country | string, label: string }) => {
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

  const getFlagUrl = (codeAlpha2: string) => {
    return `https://flagcdn.com/w40/${codeAlpha2.toLowerCase()}.png`;
  };

  return (
    <TooltipProvider delayDuration={100}>
       <div className="md:hidden">
        {countries.map((country) => (
          <CountryCard 
            key={country.id}
            country={country}
            onEditCountry={onEditCountry}
            onDeleteCountry={onDeleteCountry}
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
              <TableHead className="w-[60px] text-center font-semibold whitespace-nowrap">{t('CountryListTable.headerFlag')}</TableHead>
              <TableHead className={cn("font-semibold min-w-[150px] whitespace-nowrap")}><SortableHeader columnKey="name" label={t('CountryListTable.headerName')} /></TableHead>
              <TableHead className={cn("font-semibold whitespace-nowrap")}><SortableHeader columnKey="codeAlpha2" label={t('CountryListTable.headerCodeAlpha2')} /></TableHead>
              <TableHead className={cn("font-semibold whitespace-nowrap")}><SortableHeader columnKey="currencyCode" label={t('CountryListTable.headerCurrency')} /></TableHead>
              <TableHead className={cn("text-center font-semibold whitespace-nowrap")}><SortableHeader columnKey="isEnabled" label={t('CountryListTable.headerEnabled')} /></TableHead>
              <TableHead className={cn("text-center font-semibold whitespace-nowrap")}><SortableHeader columnKey="isDefault" label={t('CountryListTable.headerDefault')} /></TableHead>
              <TableHead className="text-center font-semibold whitespace-nowrap">{t('CountryListTable.headerActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {countries.map((country, index) => (
              <TableRow key={country.id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="text-center font-mono text-xs">{index + 1}</TableCell>
                <TableCell className="text-center">
                  {country.flagImageUrl ? (
                      <Image src={country.flagImageUrl} alt={country.name} width={32} height={20} className="rounded-sm object-contain" data-ai-hint="country flag"/>
                  ) : country.codeAlpha2 ? (
                      <Image src={getFlagUrl(country.codeAlpha2)} alt={country.name} width={32} height={20} className="rounded-sm object-contain" data-ai-hint="country flag" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  ) : <Globe className="h-5 w-5 text-muted-foreground mx-auto" />
                  }
                </TableCell>
                <TableCell className="font-medium whitespace-nowrap">{country.name}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs">{country.codeAlpha2}</TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs">{country.currencyCode || t('CountryListTable.notSet')}</TableCell>
                <TableCell className="text-center">
                  <Switch checked={country.isEnabled} onCheckedChange={(checked) => onToggleEnable(country, checked)} aria-label={t(country.isEnabled ? 'CountryListTable.disableAriaLabel' : 'CountryListTable.enableAriaLabel', { countryName: country.name })} />
                </TableCell>
                <TableCell className="text-center">
                   {country.isDefault ? (
                      <Badge variant="default" className="flex items-center justify-center gap-1 w-fit mx-auto whitespace-nowrap">
                          <CheckCircle2 className="h-4 w-4"/> {t('CountryListTable.isDefaultBadge')}
                      </Badge>
                   ) : (
                      <Button variant="outline" size="sm" onClick={() => onSetDefault(country.id)} disabled={!country.isEnabled} aria-label={t('CountryListTable.setDefaultAriaLabel', { countryName: country.name })} className="whitespace-nowrap">
                          <CircleDot className="mr-2 h-4 w-4"/> {t('CountryListTable.setDefaultButton')}
                      </Button>
                   )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onEditCountry(country)} aria-label={t('CountryListTable.editActionLabel', { countryName: country.name })} disabled={!hasPermission('manage_countries_page')}>
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{t('CountryListTable.editActionLabel', { countryName: country.name })}</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteCountry(country)} aria-label={t('CountryListTable.deleteActionLabel', { countryName: country.name })} disabled={!hasPermission('manage_countries_page')}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{t('CountryListTable.deleteActionLabel', { countryName: country.name })}</p></TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
