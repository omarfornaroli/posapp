
"use client"

import * as React from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useDexieCurrencies } from '@/hooks/useDexieCurrencies';
import { useCurrency } from '@/context/CurrencyContext';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Landmark, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function CurrencySwitcher() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { currencies, isLoading: isLoadingCurrencies } = useDexieCurrencies();
  const { currency: currentCurrency, setCurrency } = useCurrency();
  const [open, setOpen] = React.useState(false)
  const { hasPermission } = useAuth();

  const canChangeCurrency = hasPermission('change_global_currency');

  React.useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const handleCurrencyChange = (newCurrencyCode: string) => {
    setCurrency(newCurrencyCode);
    setOpen(false);
  };

  const currencyOptions = React.useMemo(() => 
    currencies
      .filter(c => c.isEnabled)
      .sort((a,b) => a.name.localeCompare(b.name))
      .map(c => ({
        value: c.code,
        label: `${c.name} (${c.symbol})`
      })),
    [currencies]
  );
  
  const selectedCurrencyObject = React.useMemo(() => 
    currencies.find(c => c.code === currentCurrency),
  [currencies, currentCurrency]);


  const isLoading = isLoadingTranslations || (isLoadingCurrencies && !currencies?.length);

  if (isLoading) {
    return (
        <Button variant="ghost" size="icon" aria-label="Loading currencies..." disabled>
            <Loader2 className="h-5 w-5 animate-spin" />
        </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              role="combobox"
              aria-expanded={open}
              aria-label={t('Header.switchCurrencyButton') || 'Switch Currency'}
              className={cn("h-10 px-2 flex items-center gap-1.5", !canChangeCurrency && "cursor-not-allowed opacity-70")}
              disabled={!canChangeCurrency || currencyOptions.length === 0}
            >
              <Landmark className="h-5 w-5 shrink-0" />
              {selectedCurrencyObject && (
                <span className="text-sm font-medium">{selectedCurrencyObject.code} {selectedCurrencyObject.symbol}</span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>{canChangeCurrency ? (t('Header.switchCurrencyButton') || 'Switch Currency') : (t('AccessDenied.message') || 'Access Denied')}</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder={t('CurrencyManager.searchPlaceholder')} />
          <CommandList>
            <CommandEmpty>{t('CurrencyManager.noResults')}</CommandEmpty>
            <CommandGroup>
                {currencyOptions.map((option) => (
                <CommandItem
                    key={option.value}
                    value={option.value} 
                    onSelect={() => handleCurrencyChange(option.value)}
                >
                    <Check
                    className={cn(
                        "mr-2 h-4 w-4",
                        currentCurrency === option.value ? "opacity-100" : "opacity-0"
                    )}
                    />
                    {option.label}
                </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
