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

import type { Product, Client, CartItem, Tax, Promotion, PaymentMethod, Currency, SaleTransaction, PendingCart } from '@/types';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, XCircle, ShoppingCart, User, TicketPercent, PercentSquare, Trash2, Camera, ScanLine, Clock, List, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { useRouter, useSearchParams } from 'next/navigation';

import CartItemCard from '@/components/pos/CartItemCard';
import ProductCard from '@/components/pos/ProductCard';
import { Combobox } from '@/components/ui/combobox';
import BarcodeScannerDialog from '@/components/pos/BarcodeScannerDialog';
import AuthorizationDialog from '@/components/pos/AuthorizationDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PendingCartsList from '@/components/pos/PendingCartsList';

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

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCartId, setActiveCartId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [pendingAuthAction, setPendingAuthAction] = useState<(() => void) | null>(null);
  const [paymentCurrency, setPaymentCurrency] = useState<Currency | null>(null);
  const [pendingCarts, setPendingCarts] = useState<PendingCart[]>([]);
  const [isLoadingPendingCarts, setIsLoadingPendingCarts] = useState(false);

  const initialView = searchParams.get('view') || 'cart';
  const [currentView, setCurrentView] = useState(initialView);


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
    // ... (implementation)
  }, [cart, t, toast]);

  const updateItemQuantity = (productId: string, newQuantity: number) => {
    // ... (implementation)
  };

  const onRemoveItem = (productId: string) => {
     // ... (implementation)
  };

  const clearCart = () => {
    setCart([]);
    setSelectedClient(null);
    setActiveCartId(null);
    toast({ title: t('Toasts.cartClearedTitle'), description: t('Toasts.cartClearedDescription') });
  };
  
  const handleScanSuccess = (barcode: string) => {
    // ... (implementation)
  };
  
  const handleSelectCart = (cartToLoad: PendingCart) => {
    // ... (implementation for checkout view)
  }

  // Memoized calculations for totals, discounts, etc.
  const {
    subtotal,
    totalAmount,
    // other calculated values...
  } = useMemo(() => {
    let currentSubtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    return { subtotal: currentSubtotal, totalAmount: currentSubtotal };
  }, [cart, selectedClient, taxes, promotions, paymentCurrency]);

  const clientOptions = useMemo(() => {
    return clients.map(c => ({ value: c.id, label: `${c.name} (${c.email})`}));
  }, [clients]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    const lowercasedTerm = searchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(lowercasedTerm) ||
      p.barcode.toLowerCase().includes(lowercasedTerm) ||
      p.sku?.toLowerCase().includes(lowercasedTerm)
    ).slice(0, 20);
  }, [products, searchTerm]);


  const renderCartView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left Column: Cart */}
      <div className="lg:col-span-2 h-full flex flex-col">
        <Card className="flex-grow flex flex-col shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline text-2xl flex items-center gap-3">
              <ShoppingCart /> {t('POSPage.cartTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-y-auto p-4">
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
                      onUpdateItemDiscount={() => {}}
                      paymentCurrency={paymentCurrency}
                    />
                  ))}
                </div>
              )}
          </CardContent>
          {cart.length > 0 && (
             <div className="border-t p-4 space-y-3">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold">{t('POSPage.subtotal')}</span>
                  <span className="font-bold">{paymentCurrency?.symbol || '$'}{subtotal.toFixed(2)}</span>
                </div>
                <Separator />
                 <div className="flex justify-between items-center text-2xl font-bold text-primary">
                  <span>{t('POSPage.total')}</span>
                  <span>{paymentCurrency?.symbol || '$'}{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <Button variant="outline" size="lg" className="w-full" onClick={clearCart}>
                        <XCircle className="mr-2"/> {t('POSPage.clearCartButton')}
                    </Button>
                    <Button size="lg" className="w-full bg-primary hover:bg-primary/90">
                        <CreditCard className="mr-2"/> {t('POSPage.processPaymentButton')}
                    </Button>
                </div>
             </div>
          )}
        </Card>
      </div>

      {/* Right Column: Search & Client */}
      <div className="h-full flex flex-col gap-6">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline text-lg flex items-center gap-2"><User /> {t('POSPage.clientSectionTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
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
        <Card className="flex-grow flex flex-col shadow-xl">
          <CardHeader>
             <CardTitle className="font-headline text-lg flex items-center gap-2"><Search /> {t('POSPage.scanOrSearchButton')}</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col">
            <div className="flex gap-2">
              <Input
                  type="text"
                  placeholder={t('POSPage.scanBarPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-grow"
              />
               <Button variant="outline" size="icon" onClick={() => setIsScannerOpen(true)}>
                  <Camera/>
               </Button>
            </div>
            <ScrollArea className="mt-4 flex-grow -mx-4">
              <div className="px-4 space-y-2">
                {isLoadingProducts ? (
                   <div className="flex justify-center items-center h-32"><Loader2 className="h-6 w-6 animate-spin"/></div>
                ) : (
                  filteredProducts.map(product => (
                    <Button key={product.id} variant="ghost" className="w-full justify-start h-auto" onClick={() => addToCart(product)}>
                      <div className="flex items-center gap-2">
                        <img src={product.imageUrl || 'https://placehold.co/40x40.png'} alt={product.name} className="w-8 h-8 rounded-sm object-cover" />
                        <div>
                          <p className="text-sm font-medium text-left">{product.name}</p>
                          <p className="text-xs text-muted-foreground text-left">{paymentCurrency?.symbol || '$'}{product.price.toFixed(2)}</p>
                        </div>
                      </div>
                    </Button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
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
    <div className="h-[calc(100vh-var(--header-height,64px)-4rem)]">
        {posSettings?.separateCartAndPayment ? (
             <Tabs value={currentView} onValueChange={(value) => router.push(`/pos?view=${value}`)} className="h-full flex flex-col">
                <TabsList className="shrink-0">
                    <TabsTrigger value="cart"><ShoppingCart className="mr-2"/>{t('POSPage.cartTitle')}</TabsTrigger>
                    <TabsTrigger value="checkout"><CreditCard className="mr-2"/>{t('POSPage.checkoutLink')}</TabsTrigger>
                </TabsList>
                <TabsContent value="cart" className="flex-grow h-full overflow-hidden">
                    {renderCartView()}
                </TabsContent>
                <TabsContent value="checkout" className="flex-grow h-full overflow-hidden">
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
