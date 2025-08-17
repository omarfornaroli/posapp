
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

import type { Product, Client, CartItem, Tax, Promotion, PaymentMethod, Currency, SaleTransaction, PendingCart, AppliedTaxEntry, AppliedPromotionEntry } from '@/types';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Search, XCircle, ShoppingCart, User, TicketPercent, PercentSquare, Trash2, Camera, ScanLine, Clock, List, CreditCard, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from 'use-debounce';

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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from '../ui/checkbox';


const generateCartId = () => `cart-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;


export default function POSPage() {
  const { t } = useRxTranslate();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

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

  useEffect(() => {
    if(currencies.length > 0) {
        const current = currencies.find(c => c.code === currentCurrencyCode);
        const defaultCurrency = currencies.find(c => c.isDefault);
        setPaymentCurrency(current || defaultCurrency || null);
    }
  }, [currentCurrencyCode, currencies]);


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
    setSelectedClient(null);
    setActiveCartId(null);
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

  const { subtotal, totalAmount, appliedPromotions, promotionalDiscountAmount, taxAmount } = useMemo(() => {
    const activePromotions = promotions.filter(p => p.isActive && new Date(p.startDate) <= new Date() && (!p.endDate || new Date(p.endDate) >= new Date()));
    let currentSubtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    let promotionalDiscount = 0;
    const appliedPromos: AppliedPromotionEntry[] = [];

    activePromotions.forEach(promo => {
      const minAmountCondition = promo.conditions.find(c => c.type === 'minSellAmount');
      if (minAmountCondition && typeof minAmountCondition.value === 'number' && currentSubtotal < minAmountCondition.value) {
        return; 
      }
      
      let discountableAmount = currentSubtotal;
      
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

    const subtotalAfterPromo = currentSubtotal - promotionalDiscount;
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
      totalAmount: total, 
      appliedPromotions: appliedPromos,
      promotionalDiscountAmount: promotionalDiscount,
      taxAmount: totalTaxAmount,
    };
  }, [cart, selectedClient, promotions, appliedTaxes, taxes]);

  const clientOptions = useMemo(() => {
    return clients.map(c => ({ value: c.id, label: `${c.name} (${c.email})`}));
  }, [clients]);

  const filteredProducts = useMemo(() => {
    if (!debouncedSearchTerm) return [];
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(lowercasedTerm) ||
      p.barcode.toLowerCase().includes(lowercasedTerm) ||
      p.sku?.toLowerCase().includes(lowercasedTerm)
    ).slice(0, 20);
  }, [products, debouncedSearchTerm]);


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
        <div className="lg:col-span-2 h-full flex flex-col gap-4">
             <Card className="shadow-sm">
                <CardHeader className="p-3">
                    <CardTitle className="font-headline text-lg flex items-center gap-2"><User /> {t('POSPage.clientSectionTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                    <Combobox
                        options={clientOptions}
                        value={selectedClient?.id || ''}
                        onChange={(value) => setSelectedClient(clients.find(c => c.id === value) || null)}
                        placeholder={t('POSPage.selectClientPlaceholder')}
                        searchPlaceholder="Search clients..."
                        emptyResultText="No clients found."
                    />
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                 <CardHeader className="p-3">
                    <CardTitle className="font-headline text-lg flex items-center gap-2"><Percent /> {t('POSPage.taxSectionTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                    {taxes.map(tax => (
                        <div key={tax.id} className="flex items-center space-x-2">
                            <Checkbox id={`tax-${tax.id}`} checked={appliedTaxes.some(at => at.taxId === tax.id)} onCheckedChange={(checked) => handleToggleTax(tax, !!checked)} />
                            <label htmlFor={`tax-${tax.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {tax.name} ({(tax.rate * 100).toFixed(2)}%)
                            </label>
                        </div>
                    ))}
                </CardContent>
            </Card>

             <Card className="flex-grow flex flex-col shadow-xl">
                <CardHeader className="p-3">
                    <CardTitle className="font-headline text-lg">{t('POSPage.summaryAndPaymentTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow p-3 space-y-2 text-sm">
                    {cart.length > 0 && (
                        <>
                        <div className="flex justify-between"><span>{t('POSPage.subtotal')}</span><span>{paymentCurrency?.symbol || '$'}{subtotal.toFixed(2)}</span></div>
                        {promotionalDiscountAmount > 0 && (
                            <div className="flex justify-between text-destructive">
                                <span>{t('POSPage.promotionalDiscountLabel')}</span>
                                <span>-{paymentCurrency?.symbol || '$'}{promotionalDiscountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        {appliedTaxes.length > 0 && (
                             <>
                                <div className="flex justify-between">
                                    <span>{t('SalesTable.headerTax')}</span>
                                    <span>{paymentCurrency?.symbol || '$'}{taxAmount.toFixed(2)}</span>
                                </div>
                            </>
                        )}
                        <Separator />
                        <div className="flex justify-between font-bold text-lg text-primary">
                            <span>{t('POSPage.total')}</span>
                            <span>{paymentCurrency?.symbol || '$'}{totalAmount.toFixed(2)}</span>
                        </div>
                        </>
                    )}
                </CardContent>
                {cart.length > 0 && (
                    <CardFooter className="p-3 flex flex-col gap-2">
                        <Button size="lg" className="w-full bg-primary hover:bg-primary/90">
                            <CreditCard className="mr-2" /> {t('POSPage.processPaymentButton')}
                        </Button>
                        <Button variant="outline" size="lg" className="w-full" onClick={clearCart}>
                            <XCircle className="mr-2" /> {t('POSPage.clearCartButton')}
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
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
                    <TabsTrigger value="cart"><ShoppingCart className="mr-2"/>{t('POSPage.cartTitle')}</TabsTrigger>
                    <TabsTrigger value="checkout"><CreditCard className="mr-2"/>{t('POSPage.checkoutLink')}</TabsTrigger>
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
