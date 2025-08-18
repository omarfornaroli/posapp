

// src/app/pos/page.tsx
'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useDexieProducts } from '@/hooks/useDexieProducts';
import { useDexieClients } from '@/hooks/useDexieClients';
import { useDexieTaxes } from '@/hooks/useDexieTaxes';
import { useDexiePromotions } from '@/hooks/useDexiePromotions';
import { useDexiePaymentMethods } from '@/hooks/useDexiePaymentMethods';
import { useDexiePOSSettings } from '@/hooks/useDexiePOSSettings';
import { useCurrency } from '@/context/CurrencyContext';
import { useDexieCurrencies } from '@/hooks/useDexieCurrencies';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/dexie-db';
import { syncService } from '@/services/sync.service';

import type { Product, Client, CartItem, Tax, Promotion, PaymentMethod, Currency, SaleTransaction, PendingCart, AppliedTaxEntry, AppliedPromotionEntry, AppliedPayment } from '@/types';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Search, XCircle, ShoppingCart, User, TicketPercent, PercentSquare, Trash2, Camera, ScanLine, Clock, List, CreditCard, Percent, ChevronDown, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import CartItemCard from '@/components/pos/CartItemCard';
import { Combobox } from '@/components/ui/combobox';
import BarcodeScannerDialog from '@/components/pos/BarcodeScannerDialog';
import AuthorizationDialog from '@/components/pos/AuthorizationDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PendingCartsList from '@/components/pos/PendingCartsList';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';


const generateCartId = () => `cart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
const generateSaleId = () => `sale-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;


export default function POSPage() {
  const { t } = useRxTranslate();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const { products, isLoading: isLoadingProducts } = useDexieProducts();
  const { clients, isLoading: isLoadingClients } = useDexieClients();
  const { taxes } = useDexieTaxes();
  const { promotions } = useDexiePromotions();
  const { paymentMethods, isLoading: isLoadingPaymentMethods } = useDexiePaymentMethods();
  const { posSettings } = useDexiePOSSettings();
  const { currency: currentCurrencyCode } = useCurrency();
  const { currencies } = useDexieCurrencies();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCartId, setActiveCartId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [pendingAuthAction, setPendingAuthAction] = useState<(() => void) | null>(null);
  const [paymentCurrency, setPaymentCurrency] = useState<Currency | null>(null);
  const [pendingCarts, setPendingCarts] = useState<PendingCart[]>([]);
  const [isLoadingPendingCarts, setIsLoadingPendingCarts] = useState(false);

  const initialView = searchParams.get('view') || 'cart';
  const [currentView, setCurrentView] = useState(initialView);

  const [appliedTaxes, setAppliedTaxes] = useState<AppliedTaxEntry[]>([]);
  
  const [overallDiscountType, setOverallDiscountType] = useState<'percentage' | 'fixedAmount' | undefined>(undefined);
  const [overallDiscountValue, setOverallDiscountValue] = useState<number | string>('');
  const [isDiscountPopoverOpen, setIsDiscountPopoverOpen] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  // States for the new payment section
  const [appliedPayments, setAppliedPayments] = useState<AppliedPayment[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  
  const formatCurrency = useCallback((amount: number) => {
    if (!paymentCurrency) return `${amount.toFixed(2)}`;
    return `${paymentCurrency.symbol || '$'}${(amount).toFixed(paymentCurrency.decimalPlaces || 2)}`;
  }, [paymentCurrency]);


  useEffect(() => {
    if(currencies.length > 0) {
        const current = currencies.find(c => c.code === currentCurrencyCode);
        const defaultCurrency = currencies.find(c => c.isDefault);
        const storedState = localStorage.getItem('posCartState');
        const savedCurrencyCode = storedState ? JSON.parse(storedState).paymentCurrencyCode : null;
        const savedCurrency = savedCurrencyCode ? currencies.find(c => c.code === savedCurrencyCode) : null;
        
        setPaymentCurrency(savedCurrency || current || defaultCurrency || null);
    }
  }, [currentCurrencyCode, currencies]);
  
  // Load state from localStorage on mount
  useEffect(() => {
    const savedStateJSON = localStorage.getItem('posCartState');
    if (savedStateJSON) {
      try {
        const savedState = JSON.parse(savedStateJSON);
        setCart(savedState.cart || []);
        setSelectedClient(savedState.selectedClient || null);
        setAppliedTaxes(savedState.appliedTaxes || []);
        setOverallDiscountType(savedState.overallDiscountType || undefined);
        setOverallDiscountValue(savedState.overallDiscountValue || '');
        setAppliedPayments(savedState.appliedPayments || []);
      } catch (error) {
        console.error("Failed to parse cart state from localStorage", error);
        localStorage.removeItem('posCartState');
      }
    }
  }, []);

  // Save state to localStorage on change
  useEffect(() => {
    const stateToSave = {
      cart,
      selectedClient,
      appliedTaxes,
      overallDiscountType,
      overallDiscountValue,
      appliedPayments,
      paymentCurrencyCode: paymentCurrency?.code
    };
    // Only save if the cart has items to avoid overwriting a refreshed page with an empty state before hydration
    if(cart.length > 0) {
        localStorage.setItem('posCartState', JSON.stringify(stateToSave));
    }
  }, [cart, selectedClient, appliedTaxes, overallDiscountType, overallDiscountValue, appliedPayments, paymentCurrency]);


  useEffect(() => {
    setCurrentView(initialView);
  }, [initialView]);

  useEffect(() => {
    // Logic to handle tab changes if needed
  }, [currentView]);

  // Fetching logic...
  useEffect(() => {
    // This could be replaced with a Dexie hook for pending carts
    const fetchPendingCarts = async () => {
      setIsLoadingPendingCarts(true);
      try {
        const response = await fetch('/api/pending-carts');
        const result = await response.json();
        if (result.success) {
          setPendingCarts(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch pending carts", error);
      } finally {
        setIsLoadingPendingCarts(false);
      }
    };

    if (posSettings?.separateCartAndPayment && currentView === 'checkout') {
      fetchPendingCarts();
    }
  }, [currentView, posSettings]);


  const addToCart = useCallback((product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevCart, { ...product, productId: product.id, quantity: 1 }];
      }
    });
    setSearchTerm('');
    toast({ title: t('Toasts.productAddedTitle'), description: t('Toasts.productAddedDescription', { productName: product.name }) });
  }, [t, toast]);

  const updateItemQuantity = (productId: string, newQuantity: number) => {
    setCart(prevCart => {
      if (newQuantity <= 0) {
        return prevCart.filter(item => item.id !== productId);
      }
      return prevCart.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const onRemoveItem = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setAppliedTaxes([]);
    setOverallDiscountType(undefined);
    setOverallDiscountValue('');
    setSelectedClient(null);
    setActiveCartId(null);
    setAppliedPayments([]);
    localStorage.removeItem('posCartState');
    toast({ title: t('Toasts.cartClearedTitle'), description: t('Toasts.cartClearedDescription') });
  };
  
  const handleScanSuccess = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if(product) {
      addToCart(product);
      setIsScannerOpen(false);
    } else {
      toast({ variant: 'destructive', title: t('POSPage.productNotFoundByBarcodeToastTitle'), description: t('POSPage.productNotFoundByBarcodeToastDescription', { barcode }) });
    }
  };
  
  const handleSelectCart = (cartToLoad: PendingCart) => {
    // ... (implementation for checkout view)
  }

  const handleToggleTax = (tax: Tax, isChecked: boolean) => {
    setAppliedTaxes(prevTaxes => {
        if (isChecked) {
            const newTaxEntry: AppliedTaxEntry = { taxId: tax.id, name: tax.name, rate: tax.rate, amount: 0 }; // Amount will be calculated in useMemo
            return [...prevTaxes, newTaxEntry];
        } else {
            return prevTaxes.filter(t => t.taxId !== tax.id);
        }
    });
  };

  const { subtotal, totalAmount, appliedPromotions, promotionalDiscountAmount, taxAmount, overallDiscountAmountApplied, totalItemDiscountAmount } = useMemo(() => {
    const activePromotions = promotions.filter(p => p.isActive && new Date(p.startDate) <= new Date() && (!p.endDate || new Date(p.endDate) >= new Date()));
    let currentSubtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    let currentItemDiscountAmount = 0;
    cart.forEach(item => {
        if (item.itemDiscountType && item.itemDiscountValue && item.itemDiscountValue > 0) {
            if (item.itemDiscountType === 'percentage') {
                currentItemDiscountAmount += (item.price * item.quantity) * (item.itemDiscountValue / 100);
            } else { // fixedAmount
                currentItemDiscountAmount += item.itemDiscountValue * item.quantity;
            }
        }
    });

    const subtotalAfterItemDiscounts = currentSubtotal - currentItemDiscountAmount;
    
    // 1. Calculate overall sale discount
    let currentOverallDiscountAmount = 0;
    if (overallDiscountType && typeof overallDiscountValue === 'number' && overallDiscountValue > 0) {
      if (overallDiscountType === 'percentage') {
        currentOverallDiscountAmount = subtotalAfterItemDiscounts * (overallDiscountValue / 100);
      } else { // fixedAmount
        currentOverallDiscountAmount = Math.min(subtotalAfterItemDiscounts, overallDiscountValue);
      }
    }
    const subtotalAfterOverallDiscount = subtotalAfterItemDiscounts - currentOverallDiscountAmount;
    
    // 2. Calculate promotional discount (on the subtotal *after* manual discount)
    let promotionalDiscount = 0;
    const appliedPromos: AppliedPromotionEntry[] = [];
    activePromotions.forEach(promo => {
      const minAmountCondition = promo.conditions.find(c => c.type === 'minSellAmount');
      if (minAmountCondition && typeof minAmountCondition.value === 'number' && subtotalAfterOverallDiscount < minAmountCondition.value) {
        return; 
      }
      
      let discountableAmount = subtotalAfterOverallDiscount;
      
      if (promo.discountType === 'percentage') {
        const discountValue = (discountableAmount * promo.discountValue) / 100;
        promotionalDiscount += discountValue;
        appliedPromos.push({ promotionId: promo.id, name: promo.name, discountType: 'percentage', discountValue: promo.discountValue, amountDeducted: discountValue });
      } else if (promo.discountType === 'fixedAmount') {
        const discountValue = Math.min(discountableAmount, promo.discountValue);
        promotionalDiscount += discountValue;
        appliedPromos.push({ promotionId: promo.id, name: promo.name, discountType: 'fixedAmount', discountValue: promo.discountValue, amountDeducted: discountValue });
      }
    });

    const subtotalAfterPromo = subtotalAfterOverallDiscount - promotionalDiscount;
    let totalTaxAmount = 0;
    
    const calculatedTaxes = appliedTaxes.map(appliedTax => {
        const taxDetails = taxes.find(t => t.id === appliedTax.taxId);
        if (taxDetails) {
            const taxAmountValue = subtotalAfterPromo * taxDetails.rate;
            totalTaxAmount += taxAmountValue;
            return { ...appliedTax, amount: taxAmountValue };
        }
        return appliedTax;
    });

    const total = subtotalAfterPromo + totalTaxAmount; 

    return { 
      subtotal: currentSubtotal,
      totalItemDiscountAmount: currentItemDiscountAmount,
      overallDiscountAmountApplied: currentOverallDiscountAmount,
      totalAmount: total, 
      appliedPromotions: appliedPromos,
      promotionalDiscountAmount: promotionalDiscount,
      taxAmount: totalTaxAmount,
    };
  }, [cart, selectedClient, promotions, appliedTaxes, taxes, overallDiscountType, overallDiscountValue]);

  const clientOptions = useMemo(() => {
    return clients.map(c => ({ value: c.id, label: `${c.name} (${c.email})`}));
  }, [clients]);

  const currencyOptions = useMemo(() => {
    return currencies.filter(c => c.isEnabled).map(c => ({ value: c.code, label: `${c.name} (${c.code})`}));
  }, [currencies]);
  
  const enabledPaymentMethods = useMemo(() => paymentMethods.filter(p => p.isEnabled), [paymentMethods]);
  
  const totalPaid = useMemo(() => appliedPayments.reduce((sum, p) => sum + p.amount, 0), [appliedPayments]);
  const amountRemaining = useMemo(() => totalAmount - totalPaid, [totalAmount, totalPaid]);

  useEffect(() => {
    if (amountRemaining > 0 && amountRemaining < 1000000) {
        setPaymentAmount(amountRemaining.toFixed(paymentCurrency?.decimalPlaces ?? 2));
    } else {
        setPaymentAmount('');
    }
  }, [amountRemaining, paymentCurrency]);


  const handleAddPayment = () => {
    if (!selectedPaymentMethod || !paymentAmount) {
      toast({ variant: 'destructive', description: t('POSPage.invalidPaymentAmount') });
      return;
    }
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', description: t('POSPage.invalidPaymentAmount') });
      return;
    }
     if (amount > amountRemaining + 0.001) { // Add tolerance for floating point issues
      toast({ variant: 'destructive', description: t('POSPage.paymentExceedsTotal', { amount: formatCurrency(amountRemaining) }) });
      return;
    }
    
    setAppliedPayments(prev => [...prev, {
        methodId: selectedPaymentMethod.id,
        methodName: selectedPaymentMethod.name,
        amount: amount
    }]);
    setPaymentAmount('');
    // Do not reset the selected payment method, user might want to use it again.
  };

  const handleRemovePayment = (index: number) => {
    setAppliedPayments(prev => prev.filter((_, i) => i !== index));
  };


  const filteredProducts = useMemo(() => {
    if (!debouncedSearchTerm) return [];
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(lowercasedTerm) ||
      p.barcode.toLowerCase().includes(lowercasedTerm) ||
      p.sku?.toLowerCase().includes(lowercasedTerm)
    ).slice(0, 20);
  }, [products, debouncedSearchTerm]);


  const handleProcessSale = async () => {
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: t('Toasts.emptyCartTitle'), description: t('Toasts.emptyCartDescription') });
      return;
    }
    if (amountRemaining > 0.001) {
      toast({ variant: 'destructive', title: t('Common.error'), description: t('POSPage.amountRemainingError', { amount: formatCurrency(amountRemaining) }) });
      return;
    }
    if (appliedPayments.length === 0) {
      toast({ variant: 'destructive', title: t('Common.error'), description: t('POSPage.noPaymentMethodsAppliedError') });
      return;
    }

    setIsProcessingSale(true);

    const baseCurrency = currencies.find(c => c.isDefault) || paymentCurrency;
    const tempId = generateSaleId();

    const saleData: SaleTransaction = {
      id: tempId,
      date: new Date().toISOString(),
      items: cart,
      subtotal,
      totalItemDiscountAmount,
      overallDiscountAmountApplied,
      promotionalDiscountAmount,
      taxAmount,
      totalAmount,
      appliedPayments,
      appliedTaxes,
      appliedPromotions,
      clientId: selectedClient?.id,
      clientName: selectedClient?.name,
      currencyCode: paymentCurrency!.code,
      currencySymbol: paymentCurrency!.symbol,
      currencyDecimalPlaces: paymentCurrency!.decimalPlaces,
      baseCurrencyCode: baseCurrency!.code,
      exchangeRate: paymentCurrency!.exchangeRate || 1,
      totalInBaseCurrency: totalAmount / (paymentCurrency!.exchangeRate || 1),
      dispatchStatus: 'Pending', // Or based on a UI switch
    };

    try {
      await db.sales.add(saleData);
      await syncService.addToQueue({ entity: 'sale', operation: 'create', data: saleData });
      
      toast({
        title: t('Toasts.paymentSuccessfulTitle'),
        description: t('Toasts.paymentSuccessfulDescription', { totalAmount: formatCurrency(totalAmount) }),
      });
      
      clearCart();
      router.push(`/receipt/${tempId}`);

    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('POSPage.errorProcessingPayment'),
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsProcessingSale(false);
    }
  };


  const renderCartView = () => (
     <div className="h-full grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Column: Search & Cart */}
        <div className="lg:col-span-3 h-full flex flex-col gap-4">
            <Card className="shadow-sm">
                <CardHeader className="p-3">
                    <CardTitle className="font-headline text-lg flex items-center gap-2"><Search /> {t('POSPage.scanOrSearchButton')}</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            placeholder={t('POSPage.scanBarPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-grow"
                        />
                        <Button variant="outline" size="icon" onClick={() => setIsScannerOpen(true)}>
                            <Camera />
                        </Button>
                    </div>
                     {filteredProducts.length > 0 && (
                        <div className="relative">
                            <div className="absolute top-2 w-full bg-background border shadow-lg rounded-md z-20">
                                <ScrollArea className="max-h-60">
                                    <div className="p-2 space-y-1">
                                        {filteredProducts.map(product => (
                                            <Button key={product.id} variant="ghost" className="w-full justify-start h-auto" onClick={() => addToCart(product)}>
                                                <div className="flex items-center gap-2">
                                                    <img src={product.imageUrl || 'https://placehold.co/40x40.png'} alt={product.name} className="w-8 h-8 rounded-sm object-cover" data-ai-hint="product image"/>
                                                    <div>
                                                        <p className="text-sm font-medium text-left">{product.name}</p>
                                                        <p className="text-xs text-muted-foreground text-left">{paymentCurrency?.symbol || '$'}{product.price.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            </Button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="flex-grow flex flex-col shadow-xl">
                <CardHeader className="p-3">
                    <CardTitle className="font-headline text-2xl flex items-center gap-3">
                        <ShoppingCart /> {t('POSPage.cartTitle')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow overflow-hidden p-3">
                    <ScrollArea className="h-full pr-3 -mr-3">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                <ShoppingCart className="h-16 w-16 mb-4" />
                                <p>{t('POSPage.cartEmpty')}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {cart.map(item => (
                                    <CartItemCard
                                        key={item.id}
                                        item={item}
                                        onUpdateQuantity={updateItemQuantity}
                                        onRemoveItem={onRemoveItem}
                                        onUpdateItemDiscount={() => { }}
                                        paymentCurrency={paymentCurrency}
                                    />
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>

        {/* Right Column: Client, Taxes, Summary */}
        <Card className="lg:col-span-2 h-full flex flex-col shadow-xl">
             <CardHeader className="p-3">
                <CardTitle className="font-headline text-lg">{t('POSPage.summaryAndPaymentTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow p-3 space-y-3 overflow-y-auto">
                {/* Client Section */}
                <div className="space-y-1">
                    <Label>{t('POSPage.clientSectionTitle')}</Label>
                    <Combobox options={clientOptions} value={selectedClient?.id || ''} onChange={(value) => setSelectedClient(clients.find(c => c.id === value) || null)} placeholder={t('POSPage.selectClientPlaceholder')} searchPlaceholder="Search clients..." emptyResultText="No clients found." />
                </div>

                {/* Currency Section */}
                 <div className="space-y-1">
                    <Label>{t('SalesTable.headerCurrency')}</Label>
                    <Select value={paymentCurrency?.code} onValueChange={(code) => setPaymentCurrency(currencies.find(c => c.code === code) || null)}>
                        <SelectTrigger><SelectValue placeholder="Select currency..." /></SelectTrigger>
                        <SelectContent>{currencyOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                    </Select>
                 </div>

                {/* Discount Section */}
                <div className="space-y-1">
                    <Label>{t('POSPage.overallSaleDiscountSectionTitle')}</Label>
                    <Popover open={isDiscountPopoverOpen} onOpenChange={setIsDiscountPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                                {overallDiscountAmountApplied > 0
                                    ? `${t('POSPage.totalDiscountLabel')}: ${paymentCurrency?.symbol || '$'}${overallDiscountAmountApplied.toFixed(2)}`
                                    : t('POSPage.itemDiscountButtonAriaLabel')}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-60 p-3 space-y-3 z-30" align="end">
                            <Label className="text-xs font-medium">{t('POSPage.overallSaleDiscountSectionTitle')}</Label>
                            <Select value={overallDiscountType} onValueChange={(val) => setOverallDiscountType(val as any)}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder={t('POSPage.discountTypePlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percentage" className="text-xs">{t('POSPage.discountTypePercentage')}</SelectItem>
                                    <SelectItem value="fixedAmount" className="text-xs">{t('POSPage.discountTypeFixedAmount')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input type="number" placeholder={t('POSPage.discountValuePlaceholder')} value={overallDiscountValue} onChange={(e) => setOverallDiscountValue(e.target.value)} className="h-8 text-xs" step="0.01" />
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => { setOverallDiscountType(undefined); setOverallDiscountValue(''); setIsDiscountPopoverOpen(false); }} className="text-xs px-2 py-1 h-auto">{t('POSPage.clearDiscountButton')}</Button>
                                <Button size="sm" onClick={() => { setOverallDiscountValue(Number(overallDiscountValue)); setIsDiscountPopoverOpen(false); }} className="text-xs px-2 py-1 h-auto bg-primary hover:bg-primary/90">{t('POSPage.applyDiscountButton')}</Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                
                {/* Tax Section */}
                <div className="space-y-1">
                    <Label>{t('POSPage.taxSectionTitle')}</Label>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                                {appliedTaxes.length > 0 ? t('POSPage.taxSectionTitle') + `: ${appliedTaxes.map(t => t.name).join(', ')}` : t('POSPage.selectTaxPlaceholder')}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                            <DropdownMenuLabel>{t('POSPage.selectTaxPlaceholder')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {taxes.length > 0 ? taxes.map(tax => (
                                <DropdownMenuCheckboxItem key={tax.id} checked={appliedTaxes.some(at => at.taxId === tax.id)} onCheckedChange={(checked) => handleToggleTax(tax, !!checked)}>
                                {tax.name} ({(tax.rate * 100).toFixed(2)}%)
                                </DropdownMenuCheckboxItem>
                            )) : (
                                <DropdownMenuItem disabled>{t('POSPage.noTaxesFound')}</DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Summary Section */}
                <div className="pt-2 space-y-2 text-sm border-t">
                    <div className="flex justify-between"><span>{t('POSPage.subtotal')}</span><span>{paymentCurrency?.symbol || '$'}{subtotal.toFixed(2)}</span></div>
                    {overallDiscountAmountApplied > 0 && <div className="flex justify-between text-destructive"><span>{t('POSPage.overallSaleDiscountSectionTitle')}</span><span>-{paymentCurrency?.symbol || '$'}{overallDiscountAmountApplied.toFixed(2)}</span></div>}
                    {promotionalDiscountAmount > 0 && <div className="flex justify-between text-destructive"><span>{t('POSPage.promotionalDiscountLabel')}</span><span>-{paymentCurrency?.symbol || '$'}{promotionalDiscountAmount.toFixed(2)}</span></div>}
                    {appliedTaxes.length > 0 && <div className="flex justify-between"><span>{t('SalesTable.headerTax')}</span><span>{paymentCurrency?.symbol || '$'}{taxAmount.toFixed(2)}</span></div>}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg text-primary"><span>{t('POSPage.total')}</span><span>{paymentCurrency?.symbol || '$'}{totalAmount.toFixed(2)}</span></div>
                </div>
                 {/* Payment Section */}
                 <div className="pt-2 space-y-2 border-t">
                    <h3 className="text-sm font-semibold">{t('POSPage.paymentSectionTitle')}</h3>
                     {appliedPayments.map((p, i) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                            <span>{p.methodName}</span>
                            <span>{paymentCurrency?.symbol || '$'}{p.amount.toFixed(2)}</span>
                             <Button variant="ghost" size="icon" onClick={() => handleRemovePayment(i)} className="h-6 w-6 text-destructive/80 hover:text-destructive"><Trash2 className="h-3.5 w-3.5"/></Button>
                        </div>
                    ))}
                    {amountRemaining > 0.001 && (
                         <div className="flex gap-2 items-end">
                            <div className="flex-grow">
                                <Label htmlFor="payment-method" className="text-xs">{t('POSPage.selectPaymentMethodPlaceholder')}</Label>
                                <Select onValueChange={(value) => setSelectedPaymentMethod(enabledPaymentMethods.find(p => p.id === value) || null)}>
                                    <SelectTrigger id="payment-method"><SelectValue /></SelectTrigger>
                                    <SelectContent>{enabledPaymentMethods.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="w-28">
                                <Label htmlFor="payment-amount" className="text-xs">{t('POSPage.paymentAmountPlaceholder')}</Label>
                                <Input id="payment-amount" type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                            </div>
                            <Button type="button" onClick={handleAddPayment} disabled={!selectedPaymentMethod || !paymentAmount}><Plus className="h-4 w-4"/></Button>
                        </div>
                    )}
                     <Separator />
                     <div className="flex justify-between text-sm"><span>{t('POSPage.totalPaidLabel')}</span><span>{paymentCurrency?.symbol || '$'}{totalPaid.toFixed(2)}</span></div>
                     <div className={cn("flex justify-between font-bold", amountRemaining > 0 ? "text-destructive" : "text-green-600")}><span>{t('POSPage.amountRemainingLabel')}</span><span>{paymentCurrency?.symbol || '$'}{amountRemaining.toFixed(2)}</span></div>
                </div>
            </CardContent>
            {cart.length > 0 && (
                <div className="p-3 flex flex-col gap-2 border-t mt-auto">
                    <Button size="lg" className="w-full bg-primary hover:bg-primary/90" onClick={handleProcessSale} disabled={amountRemaining > 0.001 || isProcessingSale}>
                      {isProcessingSale ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2" />}
                      {isProcessingSale ? t('POSPage.processingPaymentButton') : t('POSPage.processPaymentButton')}
                    </Button>
                    <Button variant="outline" size="lg" className="w-full" onClick={clearCart} disabled={isProcessingSale}>
                        <XCircle className="mr-2" /> {t('POSPage.clearCartButton')}
                    </Button>
                </div>
            )}
        </Card>
    </div>
  );

  const renderCheckoutView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Left Column: Pending Carts */}
        <div className="lg:col-span-1 h-full flex flex-col">
            <PendingCartsList
                carts={pendingCarts}
                isLoading={isLoadingPendingCarts}
                onSelectCart={handleSelectCart}
                activeCartId={activeCartId}
            />
        </div>

        {/* Right Column: Checkout Details */}
        <div className="lg:col-span-2 h-full flex flex-col">
          <Card className="flex-grow flex flex-col shadow-xl">
             <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center gap-3">
                <CreditCard /> {t('POSPage.paymentTitle')}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto p-4">
                {!activeCartId ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <List className="h-16 w-16 mb-4" />
                        <p>{t('POSPage.selectCartToCheckout')}</p>
                    </div>
                ) : (
                    <div>{/* Checkout form and details would go here */}</div>
                )}
            </CardContent>
          </Card>
        </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-var(--header-height,64px)-2rem)]">
        {posSettings?.separateCartAndPayment ? (
             <Tabs value={currentView} onValueChange={(value) => router.push(`/pos?view=${value}`)} className="h-full flex flex-col">
                <TabsList className="shrink-0">
                    <TabsTrigger value="cart"><ShoppingCart className="mr-2"/>{t('Header.cartLink')}</TabsTrigger>
                    <TabsTrigger value="checkout"><CreditCard className="mr-2"/>{t('Header.checkoutLink')}</TabsTrigger>
                </TabsList>
                <TabsContent value="cart" className="flex-grow h-full overflow-hidden mt-4">
                    {renderCartView()}
                </TabsContent>
                <TabsContent value="checkout" className="flex-grow h-full overflow-hidden mt-4">
                    {renderCheckoutView()}
                </TabsContent>
            </Tabs>
        ) : (
            renderCartView()
        )}
       
       <BarcodeScannerDialog
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScanSuccess={handleScanSuccess}
       />

       <AuthorizationDialog 
        open={isAuthDialogOpen}
        onOpenChange={setIsAuthDialogOpen}
        onSuccess={() => {
            if (pendingAuthAction) {
                pendingAuthAction();
                setPendingAuthAction(null);
            }
            setIsAuthDialogOpen(false);
        }}
       />
    </div>
  );
}
