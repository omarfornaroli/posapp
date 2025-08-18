'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { CartItem, Currency } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MinusCircle, PlusCircle, Trash2, PercentSquare } from 'lucide-react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CartItemCardProps {
  item: CartItem;
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onUpdateItemDiscount: (productId: string, discountType?: 'percentage' | 'fixedAmount', discountValue?: number) => void;
  paymentCurrency: Currency | null;
}

export default function CartItemCard({ item, onUpdateQuantity, onRemoveItem, onUpdateItemDiscount, paymentCurrency }: CartItemCardProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const [localDiscountType, setLocalDiscountType] = useState<'percentage' | 'fixedAmount' | undefined>(item.itemDiscountType);
  const [localDiscountValue, setLocalDiscountValue] = useState<string>(item.itemDiscountValue?.toString() || '');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  
  const formatCurrency = (amount: number) => {
    if (!paymentCurrency) return `${amount.toFixed(2)}`;
    return `${paymentCurrency.symbol}${amount.toFixed(paymentCurrency.decimalPlaces)}`;
  };

  useEffect(() => {
    setLocalDiscountType(item.itemDiscountType);
    setLocalDiscountValue(item.itemDiscountValue?.toString() || '');
  }, [item.itemDiscountType, item.itemDiscountValue]);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value, 10);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      onUpdateQuantity(item.id, newQuantity);
    }
  };

  const incrementQuantity = () => onUpdateQuantity(item.id, item.quantity + 1);
  const decrementQuantity = () => { if (item.quantity > 0) onUpdateQuantity(item.id, item.quantity - 1); };

  const handleApplyDiscount = () => {
    const value = parseFloat(localDiscountValue);
    if (localDiscountType && !isNaN(value) && value >= 0) {
      onUpdateItemDiscount(item.id, localDiscountType, value);
    } else if (!localDiscountType && localDiscountValue === '') { // Clearing discount
        onUpdateItemDiscount(item.id, undefined, undefined);
    }
    setIsPopoverOpen(false);
  };
  
  const handleClearDiscount = () => {
    setLocalDiscountType(undefined);
    setLocalDiscountValue('');
    onUpdateItemDiscount(item.id, undefined, undefined);
    setIsPopoverOpen(false);
  };

  const exchangeRate = paymentCurrency?.exchangeRate ?? 1;

  // Calculate the item price after its specific discount, in the base currency first.
  let priceInBaseAfterDiscount = item.price;
  if (item.itemDiscountType && typeof item.itemDiscountValue === 'number' && item.itemDiscountValue > 0) {
    if (item.itemDiscountType === 'percentage') {
      priceInBaseAfterDiscount = item.price * (1 - item.itemDiscountValue / 100);
    } else { // fixedAmount
      priceInBaseAfterDiscount = Math.max(0, item.price - item.itemDiscountValue);
    }
  }

  // Convert all relevant values to the selected payment currency for display
  const displayOriginalPrice = item.price * exchangeRate;
  const displayPriceAfterDiscount = priceInBaseAfterDiscount * exchangeRate;
  const displayTotalPrice = displayPriceAfterDiscount * item.quantity;
  // Also convert the fixed discount amount for display
  const displayFixedDiscountValue = (item.itemDiscountType === 'fixedAmount' ? (item.itemDiscountValue || 0) : 0) * exchangeRate;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border-b bg-card rounded-lg mb-2 shadow-sm relative">
        
        {/* Info Part */}
        <div className="flex flex-grow items-center gap-3 w-full">
          <Image
            src={item.imageUrl || `https://placehold.co/64x64.png`}
            alt={item.name}
            width={56}
            height={56}
            className="rounded-md object-cover flex-shrink-0"
            data-ai-hint={`${item.category} item`}
          />
          <div className="flex-grow">
            <h4 className="font-semibold font-body text-sm">{item.name}</h4>
            <div className="flex items-center gap-1 flex-wrap">
              <p className="text-xs text-muted-foreground">
                {t('CartItemCardComponent.eachText')}
              </p>
              {item.itemDiscountValue && item.itemDiscountValue > 0 ? (
                <>
                  <span className="text-xs text-destructive line-through">
                    {formatCurrency(displayOriginalPrice)}
                  </span>
                  <span className="text-xs text-primary font-medium">
                    {formatCurrency(displayPriceAfterDiscount)}
                  </span>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">{formatCurrency(displayOriginalPrice)}</p>
              )}
            </div>
            {item.itemDiscountValue && item.itemDiscountValue > 0 && (
              <p className="text-xs text-primary font-medium">
                {item.itemDiscountType === 'percentage' ? `(-${item.itemDiscountValue}%)` : `(-${formatCurrency(displayFixedDiscountValue)})`}
              </p>
            )}
          </div>
        </div>
        
        {/* Spacer for desktop layout */}
        <div className="hidden sm:flex sm:flex-grow"></div>

        {/* Controls Part */}
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-dashed">
            {/* Quantity controls */}
            <div className="flex items-center gap-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={decrementQuantity} aria-label={t('CartItemCardComponent.decreaseQuantityAriaLabel')} className="h-7 w-7">
                        <MinusCircle className="h-5 w-5" />
                    </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('CartItemCardComponent.decreaseQuantityAriaLabel')}</p></TooltipContent>
                </Tooltip>
                <Input
                    type="number"
                    value={item.quantity}
                    onChange={handleQuantityChange}
                    className="w-16 text-center h-8 text-sm"
                    min="0"
                    aria-label={t('CartItemCardComponent.itemQuantityAriaLabel')}
                />
                <Tooltip>
                    <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={incrementQuantity} aria-label={t('CartItemCardComponent.increaseQuantityAriaLabel')} className="h-7 w-7">
                        <PlusCircle className="h-5 w-5" />
                    </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('CartItemCardComponent.increaseQuantityAriaLabel')}</p></TooltipContent>
                </Tooltip>
            </div>

            <p className="font-semibold text-primary text-base">{formatCurrency(displayTotalPrice)}</p>
            
            <div className="flex items-center gap-1">
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary/80 hover:text-primary" aria-label={t('POSPage.itemDiscountButtonAriaLabel')}>
                            <PercentSquare className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent><p>{t('POSPage.itemDiscountButtonAriaLabel')}</p></TooltipContent>
                    </Tooltip>
                    <PopoverContent className="w-60 p-3 space-y-3 z-30" align="end">
                        <Label className="text-xs font-medium">{t('POSPage.itemDiscountLabel')}: {item.name}</Label>
                        <Select value={localDiscountType} onValueChange={(val) => setLocalDiscountType(val as 'percentage' | 'fixedAmount' | undefined)}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder={t('POSPage.discountTypePlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="percentage" className="text-xs">{t('POSPage.discountTypePercentage')}</SelectItem>
                            <SelectItem value="fixedAmount" className="text-xs">{t('POSPage.discountTypeFixedAmount')}</SelectItem>
                        </SelectContent>
                        </Select>
                        <Input 
                        type="number" 
                        placeholder={t('POSPage.discountValuePlaceholder')}
                        value={localDiscountValue}
                        onChange={(e) => setLocalDiscountValue(e.target.value)}
                        className="h-8 text-xs"
                        step="0.01"
                        />
                        <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={handleClearDiscount} className="text-xs px-2 py-1 h-auto">{t('POSPage.clearDiscountButton')}</Button>
                        <Button size="sm" onClick={handleApplyDiscount} className="text-xs px-2 py-1 h-auto bg-primary hover:bg-primary/90">{t('POSPage.applyDiscountButton')}</Button>
                        </div>
                    </PopoverContent>
                </Popover>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => onRemoveItem(item.id)} className="text-destructive hover:text-destructive/80 h-7 w-7" aria-label={t('CartItemCardComponent.removeItemAriaLabel')}>
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>{t('CartItemCardComponent.removeItemAriaLabel')}</p></TooltipContent>
                </Tooltip>
            </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
