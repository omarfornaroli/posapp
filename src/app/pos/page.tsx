
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ScanLine, DollarSign, Trash2, ShoppingCart, User, Percent, Search, Loader2, Tag, Wallet, ListChecks, X, ClipboardList, Plus, Scan, PercentSquare, ShieldAlert, Landmark, Camera, Truck, Save } from 'lucide-react';
import type { Product, CartItem, SaleTransaction, Client, Tax, AppliedTaxEntry, Promotion, AppliedPromotionEntry, PaymentMethod, AppliedPayment, PromotionCondition, Currency, ReceiptSetting, POSSetting, PendingCart } from '@/types';
import CartItemCard from '@/components/pos/CartItemCard';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useDexieCurrencies } from '@/hooks/useDexieCurrencies';
import { useDexieProducts } from '@/hooks/useDexieProducts';
import { useDexieClients } from '@/hooks/useDexieClients';
import { useDexiePromotions } from '@/hooks/useDexiePromotions';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext'; 
import AccessDeniedMessage from '@/components/AccessDeniedMessage';
import { Combobox } from '@/components/ui/combobox';
import BarcodeScannerDialog from '@/components/pos/BarcodeScannerDialog';
import AuthorizationDialog from '@/components/pos/AuthorizationDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRealtimePOSSettings } from '@/hooks/useRealtimePOSSettings';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PendingCartsList from '@/components/pos/PendingCartsList';

const MIN_SEARCH_LENGTH = 3;
const MIN_CHARS_FOR_LIVE_SEARCH = 2;
const POS_APP_PERSISTED_STATE_KEY = 'posAppPersistedState_v2'; 

interface AppliedTaxDefinition {
  id: string;
  name: string;
  rate: number;
}

interface PersistedPOSState {
  cart: CartItem[]; 
  selectedClientId?: string;
  appliedTaxDefinitions: AppliedTaxDefinition[];
  currentAppliedPayments: AppliedPayment[];
  barcodeInput: string;
  isContinuousScanMode: boolean;
  overallDiscountType?: 'percentage' | 'fixedAmount';
  overallDiscountValue?: number;
  paymentCurrencyCode?: string; // Persist currency code
}

export default function POSPage() {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { hasPermission } = useAuth();
  const { currency: globalCurrency } = useCurrency();
  const { products, isLoading: isLoadingProducts } = useDexieProducts();
  const { clients, isLoading: isLoadingClients } = useDexieClients();
  const { promotions: availablePromotions, isLoading: isLoadingPromotions } = useDexiePromotions();
  const { posSettings, isLoading: isLoadingSettings } = useRealtimePOSSettings();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');

  const [subtotalFromOriginalPrices, setSubtotalFromOriginalPrices] = useState(0);
  const [totalItemDiscountAmount, setTotalItemDiscountAmount] = useState(0);
  const [subtotalAfterItemDiscounts, setSubtotalAfterItemDiscounts] = useState(0);
  
  const [overallDiscountType, setOverallDiscountType] = useState<'percentage' | 'fixedAmount' | undefined>(undefined);
  const [overallDiscountValue, setOverallDiscountValue] = useState<string>(''); 
  const [overallDiscountAmountApplied, setOverallDiscountAmountApplied] = useState(0);
  
  const [subtotalBeforePromotions, setSubtotalBeforePromotions] = useState(0);
  const [promotionalDiscountAmount, setPromotionalDiscountAmount] = useState(0);
  const [appliedPromotionsForDisplay, setAppliedPromotionsForDisplay] = useState<AppliedPromotionEntry[]>([]);
  
  const [taxableAmount, setTaxableAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0); 
  const [finalTotalAmount, setFinalTotalAmount] = useState(0); // This will be in the selected transaction currency
  const [finalTotalInBaseCurrency, setFinalTotalInBaseCurrency] = useState(0);

  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);

  const [availableTaxes, setAvailableTaxes] = useState<Tax[]>([]);
  const [isLoadingTaxes, setIsLoadingTaxes] = useState(true);
  const [appliedTaxDefinitions, setAppliedTaxDefinitions] = useState<AppliedTaxDefinition[]>([]);
  const [taxBreakdownForDisplay, setTaxBreakdownForDisplay] = useState<AppliedTaxEntry[]>([]);
  const [selectedTaxToAddId, setSelectedTaxToAddId] = useState<string>('');

  const [liveSearchResults, setLiveSearchResults] = useState<Product[]>([]);
  const [isLiveSearchVisible, setIsLiveSearchVisible] = useState(false);

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(true);
  const [currentAppliedPayments, setCurrentAppliedPayments] = useState<AppliedPayment[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [itemToRemoveId, setItemToRemoveId] = useState<string | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  const [isContinuousScanMode, setIsContinuousScanMode] = useState(false);
  const continuousScanInputRef = useRef<HTMLInputElement>(null);

  const [isStateLoadedFromStorage, setIsStateLoadedFromStorage] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  const [dispatchOnSale, setDispatchOnSale] = useState(true);

  const { currencies, isLoading: isLoadingCurrencies } = useDexieCurrencies();
  const [paymentCurrency, setPaymentCurrency] = useState<Currency | null>(null);
  const baseCurrency = useMemo(() => currencies.find(c => c.isDefault) || currencies[0], [currencies]);
  
  const useSeparatePanels = posSettings?.separateCartAndPayment ?? false;
  
  const [pendingCarts, setPendingCarts] = useState<PendingCart[]>([]);
  const [isLoadingPendingCarts, setIsLoadingPendingCarts] = useState(false);
  const [activePendingCartId, setActivePendingCartId] = useState<string | null>(null);
  const [isSavingCart, setIsSavingCart] = useState(false);

  const fetchPendingCarts = useCallback(async () => {
    setIsLoadingPendingCarts(true);
    try {
        const response = await fetch('/api/pending-carts');
        const result = await response.json();
        if (result.success) {
            setPendingCarts(result.data);
        } else {
            toast({ variant: 'destructive', title: t('Common.error'), description: 'Failed to fetch pending carts.' });
        }
    } catch (error) {
        toast({ variant: 'destructive', title: t('Common.error'), description: 'Error fetching pending carts.' });
    } finally {
        setIsLoadingPendingCarts(false);
    }
  }, [t, toast]);
  
  const getDefaultTab = useCallback(() => {
    if (!useSeparatePanels) return 'cart';
    const view = searchParams.get('view');
    return view === 'checkout' ? 'payment' : 'cart';
  }, [useSeparatePanels, searchParams]);

  const [activeTab, setActiveTab] = useState(getDefaultTab());

  useEffect(() => {
    const defaultTab = getDefaultTab();
    if(activeTab !== defaultTab) {
        setActiveTab(defaultTab);
    }
  }, [useSeparatePanels, searchParams, getDefaultTab, activeTab]);

  useEffect(() => {
    if (activeTab === 'payment') {
        fetchPendingCarts();
    }
  }, [activeTab, fetchPendingCarts]);


  useEffect(() => {
    if (posSettings) {
      setDispatchOnSale(posSettings.dispatchAtSaleDefault ?? true);
    }
  }, [posSettings]);

  // Sync with global currency only when cart is empty
  useEffect(() => {
    if (cart.length === 0 && currencies.length > 0 && globalCurrency) {
      const newGlobalCurrencyObject = currencies.find(c => c.code === globalCurrency);
      if (newGlobalCurrencyObject) {
        setPaymentCurrency(newGlobalCurrencyObject);
      }
    }
  }, [globalCurrency, cart.length, currencies]);

  // Load state from local storage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && currencies.length > 0 && !activePendingCartId) { // Do not load from LS if a pending cart is active
      const persistedStateString = localStorage.getItem(POS_APP_PERSISTED_STATE_KEY);
      if (persistedStateString) {
        try {
          const persistedState = JSON.parse(persistedStateString) as PersistedPOSState;
          setCart(persistedState.cart || []);
          setSelectedClientId(persistedState.selectedClientId);
          setAppliedTaxDefinitions(persistedState.appliedTaxDefinitions || []);
          setCurrentAppliedPayments(persistedState.currentAppliedPayments || []);
          setBarcodeInput(persistedState.barcodeInput || '');
          setIsContinuousScanMode(persistedState.isContinuousScanMode || false);
          setOverallDiscountType(persistedState.overallDiscountType);
          setOverallDiscountValue(persistedState.overallDiscountValue?.toString() || '');
          
          const persistedCurrency = currencies.find(c => c.code === persistedState.paymentCurrencyCode);
          if (persistedState.cart.length > 0 && persistedCurrency) {
            setPaymentCurrency(persistedCurrency);
          } else {
            const globalCurrencyObject = currencies.find(c => c.code === globalCurrency);
            setPaymentCurrency(globalCurrencyObject || baseCurrency);
          }

        } catch (e) {
          console.error("Failed to parse persisted POS state:", e);
          const globalCurrencyObject = currencies.find(c => c.code === globalCurrency);
          setPaymentCurrency(globalCurrencyObject || baseCurrency);
        }
      } else {
         const globalCurrencyObject = currencies.find(c => c.code === globalCurrency);
         setPaymentCurrency(globalCurrencyObject || baseCurrency);
      }
      setIsStateLoadedFromStorage(true); 
    }
  }, [currencies, baseCurrency, globalCurrency, activePendingCartId]); // Depend on currencies to ensure they are loaded

  // Persist state to local storage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && isStateLoadedFromStorage && !activePendingCartId) {
      const stateToPersist: PersistedPOSState = {
        cart,
        selectedClientId,
        appliedTaxDefinitions,
        currentAppliedPayments,
        barcodeInput,
        isContinuousScanMode,
        overallDiscountType,
        overallDiscountValue: overallDiscountValue ? parseFloat(overallDiscountValue) : undefined,
        paymentCurrencyCode: paymentCurrency?.code
      };
      localStorage.setItem(POS_APP_PERSISTED_STATE_KEY, JSON.stringify(stateToPersist));
    }
  }, [cart, selectedClientId, appliedTaxDefinitions, currentAppliedPayments, barcodeInput, isContinuousScanMode, overallDiscountType, overallDiscountValue, isStateLoadedFromStorage, paymentCurrency, activePendingCartId]);


  const totalPaidAmount = useMemo(() => {
    return currentAppliedPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [currentAppliedPayments]);

  const amountRemainingToPay = useMemo(() => {
    return Math.max(0, finalTotalAmount - totalPaidAmount);
  }, [finalTotalAmount, totalPaidAmount]);

  const fetchInitialPOSData = useCallback(async () => {
    setIsLoadingTaxes(true);
    setIsLoadingPaymentMethods(true);
    try {
      const [taxesResponse, paymentMethodsResponse] = await Promise.all([
        fetch('/api/taxes'),
        fetch('/api/payment-methods')
      ]);

      if (!taxesResponse.ok) throw new Error('Failed to fetch taxes');
      const taxesResult = await taxesResponse.json();
      if (taxesResult.success) setAvailableTaxes(taxesResult.data);
      else throw new Error(taxesResult.error || 'Failed to fetch taxes');

      if (!paymentMethodsResponse.ok) throw new Error(t('POSPage.errorFetchingPaymentMethods'));
      const paymentMethodsResult = await paymentMethodsResponse.json();
      if (paymentMethodsResult.success) {
        setAvailablePaymentMethods(paymentMethodsResult.data.filter((pm: PaymentMethod) => pm.isEnabled));
        const defaultMethod = paymentMethodsResult.data.find((pm: PaymentMethod) => pm.isDefault && pm.isEnabled);
        if (defaultMethod) setSelectedPaymentMethodId(defaultMethod.id);
        else if (paymentMethodsResult.data.length > 0 && paymentMethodsResult.data.filter((pm: PaymentMethod) => pm.isEnabled).length > 0) {
          setSelectedPaymentMethodId(paymentMethodsResult.data.filter((pm: PaymentMethod) => pm.isEnabled)[0].id);
        }
      } else {
        throw new Error(paymentMethodsResult.error || t('POSPage.errorFetchingPaymentMethods'));
      }

    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('POSPage.errorFetchingInitialData'),
      });
      setAvailableTaxes([]);
      setAvailablePaymentMethods([]);
    } finally {
      setIsLoadingTaxes(false);
      setIsLoadingPaymentMethods(false);
    }
  }, [toast, t]);

  useEffect(() => {
    if (!isLoadingTranslations && hasPermission('access_pos_page')) {
      fetchInitialPOSData();
    }
  }, [fetchInitialPOSData, isLoadingTranslations, hasPermission]);

  useEffect(() => {
    if (finalTotalAmount > 0 && amountRemainingToPay > 0 && paymentCurrency) {
      setPaymentAmountInput(amountRemainingToPay.toFixed(paymentCurrency.decimalPlaces));
    } else {
      setPaymentAmountInput('');
    }
  }, [finalTotalAmount, amountRemainingToPay, paymentCurrency]);

  const calculateTotals = useCallback(() => {
    if (!baseCurrency || !paymentCurrency) return;

    let currentSubtotalFromOriginalPrices = 0;
    let currentTotalItemDiscountAmount = 0;
    const cartWithEffectivePrices: CartItem[] = cart.map(item => {
      currentSubtotalFromOriginalPrices += item.price * item.quantity;
      let effectivePrice = item.price;
      let itemDiscountApplied = 0;
      if (item.itemDiscountType && typeof item.itemDiscountValue === 'number' && item.itemDiscountValue > 0) {
        if (item.itemDiscountType === 'percentage') {
          itemDiscountApplied = item.price * (item.itemDiscountValue / 100);
        } else { 
          itemDiscountApplied = item.itemDiscountValue;
        }
        itemDiscountApplied = Math.min(itemDiscountApplied, item.price); 
        effectivePrice = item.price - itemDiscountApplied;
      }
      currentTotalItemDiscountAmount += itemDiscountApplied * item.quantity;
      return { ...item, effectivePrice, totalPriceAfterItemDiscount: effectivePrice * item.quantity };
    });

    const currentSubtotalAfterItemDiscounts = currentSubtotalFromOriginalPrices - currentTotalItemDiscountAmount;
    
    let currentOverallSaleDiscountAmountApplied = 0;
    if (overallDiscountType && overallDiscountValue && parseFloat(overallDiscountValue) > 0) {
      const val = parseFloat(overallDiscountValue);
      if (overallDiscountType === 'percentage') {
        currentOverallSaleDiscountAmountApplied = currentSubtotalAfterItemDiscounts * (val / 100);
      } else { 
        currentOverallSaleDiscountAmountApplied = val;
      }
      currentOverallSaleDiscountAmountApplied = Math.min(currentOverallSaleDiscountAmountApplied, currentSubtotalAfterItemDiscounts); 
    }

    const currentSubtotalBeforePromotions = currentSubtotalAfterItemDiscounts - currentOverallSaleDiscountAmountApplied;

    let currentPromotionalDiscountAmount = 0;
    const currentAppliedPromosForDisplay: AppliedPromotionEntry[] = [];
    const now = new Date().toISOString();

    if (availablePromotions.length > 0 && cartWithEffectivePrices.length > 0) {
      const activePromotions = availablePromotions.filter(promo => {
        const isActiveDate = promo.startDate <= now && (!promo.endDate || promo.endDate >= now);
        return promo.isActive && isActiveDate;
      });

      for (const promo of activePromotions) {
        let conditionsMet = true;
        // Check general conditions first
        for (const condition of promo.conditions) {
          if (!conditionsMet) break;
          switch (condition.type) {
            case 'minSellAmount': 
              if (condition.value === undefined || currentSubtotalBeforePromotions < condition.value) conditionsMet = false;
              break;
            case 'clientIds':
              if (!condition.values || !(selectedClientId && condition.values?.includes(selectedClientId))) conditionsMet = false;
              break;
            case 'paymentMethods':
              if (!condition.values || currentAppliedPayments.length === 0 || !currentAppliedPayments.some(appliedPayment => condition.values?.includes(appliedPayment.methodId))) conditionsMet = false;
              break;
            default: break;
          }
        }
        if (!conditionsMet) continue;

        let discountValueForThisPromo = 0;

        if (promo.applicationMethod === 'lowestPriceItem') {
          const itemQuantityCondition = promo.conditions.find(c => c.type === 'itemQuantity');
          if (!itemQuantityCondition || itemQuantityCondition.value === undefined) continue;

          const productScopeConditions = promo.conditions.filter(c => c.type === 'productIds' || c.type === 'productCategories');
          let matchingCartItems = cartWithEffectivePrices;

          if (productScopeConditions.length > 0) {
            matchingCartItems = cartWithEffectivePrices.filter(cartItem => {
              return productScopeConditions.every(cond => {
                if (!cond.values) return false;
                if (cond.type === 'productIds') return cond.values.includes(cartItem.id);
                if (cond.type === 'productCategories') return cond.values.includes(cartItem.category);
                return true;
              });
            });
          }
          
          const totalQuantity = matchingCartItems.reduce((sum, item) => sum + item.quantity, 0);
          if (totalQuantity < itemQuantityCondition.value) continue;

          if (matchingCartItems.length === 0) continue;

          const lowestPricedItem = matchingCartItems.reduce((lowest, current) => 
            (current.effectivePrice ?? current.price) < (lowest.effectivePrice ?? lowest.price) ? current : lowest
          );

          const priceToDiscount = lowestPricedItem.effectivePrice ?? lowestPricedItem.price;
          if (promo.discountType === 'percentage') {
            discountValueForThisPromo = priceToDiscount * (promo.discountValue / 100);
          } else {
            discountValueForThisPromo = promo.discountValue;
          }
          discountValueForThisPromo = Math.min(discountValueForThisPromo, priceToDiscount);
        
        } else { // Default 'cart' application method
          if (promo.discountType === 'percentage') {
            discountValueForThisPromo = currentSubtotalBeforePromotions * (promo.discountValue / 100);
          } else {
            discountValueForThisPromo = promo.discountValue;
          }
        }
        
        const actualDeduction = Math.min(discountValueForThisPromo, currentSubtotalBeforePromotions - currentPromotionalDiscountAmount);
        if (actualDeduction > 0) {
          currentAppliedPromosForDisplay.push({
            promotionId: promo.id, name: promo.name,
            discountType: promo.discountType, discountValue: promo.discountValue,
            amountDeducted: parseFloat(actualDeduction.toFixed(baseCurrency.decimalPlaces))
          });
          currentPromotionalDiscountAmount += actualDeduction;
        }
      }
    }
    currentPromotionalDiscountAmount = Math.min(currentPromotionalDiscountAmount, currentSubtotalBeforePromotions);

    const currentTaxableAmount = currentSubtotalBeforePromotions - currentPromotionalDiscountAmount;
    
    let currentTotalTax = 0;
    const currentTaxBreakdownForDisplay: AppliedTaxEntry[] = appliedTaxDefinitions.map(taxDef => {
      const taxForThis = currentTaxableAmount * taxDef.rate;
      currentTotalTax += taxForThis;
      return { ...taxDef, amount: parseFloat(taxForThis.toFixed(baseCurrency.decimalPlaces)) };
    });

    const currentFinalTotalInBase = currentTaxableAmount + currentTotalTax;

    setSubtotalFromOriginalPrices(parseFloat(currentSubtotalFromOriginalPrices.toFixed(baseCurrency.decimalPlaces)));
    setTotalItemDiscountAmount(parseFloat(currentTotalItemDiscountAmount.toFixed(baseCurrency.decimalPlaces)));
    setSubtotalAfterItemDiscounts(parseFloat(currentSubtotalAfterItemDiscounts.toFixed(baseCurrency.decimalPlaces)));
    setOverallDiscountAmountApplied(parseFloat(currentOverallSaleDiscountAmountApplied.toFixed(baseCurrency.decimalPlaces)));
    setSubtotalBeforePromotions(parseFloat(currentSubtotalBeforePromotions.toFixed(baseCurrency.decimalPlaces)));
    setPromotionalDiscountAmount(parseFloat(currentPromotionalDiscountAmount.toFixed(baseCurrency.decimalPlaces)));
    setAppliedPromotionsForDisplay(currentAppliedPromosForDisplay);
    setTaxableAmount(parseFloat(currentTaxableAmount.toFixed(baseCurrency.decimalPlaces)));
    setTaxBreakdownForDisplay(currentTaxBreakdownForDisplay);
    setTaxAmount(parseFloat(currentTotalTax.toFixed(baseCurrency.decimalPlaces)));
    setFinalTotalInBaseCurrency(parseFloat(currentFinalTotalInBase.toFixed(baseCurrency.decimalPlaces)));

    const exchangeRate = paymentCurrency?.exchangeRate || 1;
    setFinalTotalAmount(parseFloat((currentFinalTotalInBase * exchangeRate).toFixed(paymentCurrency?.decimalPlaces || 2)));
    
  }, [cart, baseCurrency, paymentCurrency, availablePromotions, selectedClientId, appliedTaxDefinitions, overallDiscountType, overallDiscountValue, currentAppliedPayments]);

  useEffect(() => {
    calculateTotals();
  }, [calculateTotals]);

  const addProductToCart = (product: Product, quantity: number = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity + quantity > product.quantity) {
          toast({ title: t('Toasts.stockLimitReachedTitle'), description: t('Toasts.stockLimitReachedDescription', { productName: product.name, maxStock: product.quantity }), variant: "destructive" });
          return prevCart.map(item => item.id === product.id ? { ...item, quantity: product.quantity } : item);
        }
        return prevCart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      } else {
        if (quantity > product.quantity) {
           toast({ title: t('Toasts.stockLimitReachedTitle'), description: t('Toasts.stockLimitReachedDescription', { productName: product.name, maxStock: product.quantity }), variant: "destructive" });
          return [...prevCart, { ...product, id: product.id || product.barcode, quantity: product.quantity, itemDiscountType: undefined, itemDiscountValue: undefined }];
        }
        return [...prevCart, { ...product, id: product.id || product.barcode, quantity, itemDiscountType: undefined, itemDiscountValue: undefined }];
      }
    });
  };

  const handleUpdateItemDiscount = useCallback((productId: string, discountType?: 'percentage' | 'fixedAmount', discountValue?: number) => {
    setCart(prevCart => prevCart.map(item => 
      item.id === productId 
        ? { ...item, itemDiscountType: discountType, itemDiscountValue: discountValue }
        : item
    ));
  }, []);

  const handleBarcodeScan = (inputValue: string, isContinuous: boolean = false) => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    if (isContinuous) {
        const productByBarcode = products.find(p => p.barcode === trimmedInput);
        if (productByBarcode) {
            addProductToCart(productByBarcode);
            toast({ title: t('Toasts.productAddedTitle'), description: t('Toasts.productAddedDescription', { productName: productByBarcode.name }) });
        } else {
            toast({ title: t('POSPage.productNotFoundByBarcodeToastTitle'), description: t('POSPage.productNotFoundByBarcodeToastDescription', {barcode: trimmedInput}), variant: "destructive" });
        }
        setBarcodeInput(''); 
        continuousScanInputRef.current?.focus();
        return;
    }

    setIsLiveSearchVisible(false);
    const productByBarcode = products.find(p => p.barcode === trimmedInput);
    if (productByBarcode) {
      addProductToCart(productByBarcode);
      setBarcodeInput('');
      toast({ title: t('Toasts.productAddedTitle'), description: t('Toasts.productAddedDescription', { productName: productByBarcode.name }) });
      return;
    }

    if (trimmedInput.length >= MIN_SEARCH_LENGTH) {
      const productsByName = products.filter(p => p.name.toLowerCase().includes(trimmedInput.toLowerCase()));
      if (productsByName.length === 1) {
        addProductToCart(productsByName[0]);
        setBarcodeInput('');
        toast({ title: t('Toasts.productAddedTitle'), description: t('Toasts.productAddedDescription', { productName: productsByName[0].name }) });
        return;
      }
      if (productsByName.length > 1) {
        toast({ title: t('Toasts.multipleProductsFoundTitle'), description: t('Toasts.multipleProductsFoundDescription') });
        return;
      }
    }
    toast({ title: t('Toasts.productNotFoundTitle'), description: t('Toasts.productNotFoundDescription'), variant: "destructive" });
  };
  
  const handleCameraScanSuccess = (decodedText: string) => {
    setIsScannerOpen(false);
    handleBarcodeScan(decodedText, false);
  };

  const toggleContinuousScanMode = () => {
    setIsContinuousScanMode(prev => {
        const newMode = !prev;
        if (newMode) {
            setIsLiveSearchVisible(false); 
            setTimeout(() => continuousScanInputRef.current?.focus(), 0);
        }
        return newMode;
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    setCart(prevCart => {
      const productInCart = prevCart.find(item => item.id === productId);
      if (!productInCart) return prevCart;
      const originalProductData = products.find(p => p.id === productInCart.id);
      if (!originalProductData) return prevCart;

      const stockLimit = originalProductData.quantity;

      if (newQuantity < 0) newQuantity = 0;
      if (newQuantity > stockLimit) {
        toast({ title: t('Toasts.stockLimitReachedTitle'), description: t('Toasts.stockLimitReachedDescription', { productName: originalProductData.name, maxStock: stockLimit }), variant: "destructive" });
        newQuantity = stockLimit;
      }
      if (newQuantity === 0) return prevCart.filter(item => item.id !== productId);
      return prevCart.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item);
    });
  };

  const handleRequestRemoveItem = (productId: string) => {
    if (posSettings?.requireAuthForCartItemRemoval) {
        setItemToRemoveId(productId);
        setIsAuthDialogOpen(true);
    } else {
        setCart(prevCart => prevCart.filter(item => item.id !== productId));
        toast({ title: t('Toasts.itemRemovedTitle'), description: t('Toasts.itemRemovedDescription') });
    }
  };

  const handleAuthorizationSuccess = () => {
    if (itemToRemoveId) {
      setCart(prevCart => prevCart.filter(item => item.id !== itemToRemoveId));
      toast({ title: t('Toasts.itemRemovedTitle'), description: t('Toasts.itemRemovedDescription') });
    }
    setItemToRemoveId(null);
    setIsAuthDialogOpen(false);
  };

  const clearCart = () => {
    setCart([]);
    setSelectedClientId(undefined);
    setAppliedTaxDefinitions([]); 
    setTaxBreakdownForDisplay([]); 
    setCurrentAppliedPayments([]);
    setPaymentAmountInput('');
    setBarcodeInput('');
    setOverallDiscountType(undefined);
    setOverallDiscountValue('');
    setActivePendingCartId(null); // Clear active pending cart
    const globalCurrencyObject = currencies.find(c => c.code === globalCurrency);
    setPaymentCurrency(globalCurrencyObject || baseCurrency);
    if (typeof window !== 'undefined' && !activePendingCartId) { // Only remove if it wasn't a pending cart
      localStorage.removeItem(POS_APP_PERSISTED_STATE_KEY);
    }
    toast({ title: t('Toasts.cartClearedTitle'), description: t('Toasts.cartClearedDescription') });
  };

  const handleAddPayment = () => {
    if (!paymentCurrency) return;
    const amount = parseFloat(paymentAmountInput);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: t('Common.error'), description: t('POSPage.invalidPaymentAmount'), variant: 'destructive' });
      return;
    }
    if (!selectedPaymentMethodId) {
      toast({ title: t('Common.error'), description: t('POSPage.selectPaymentMethod'), variant: 'destructive' });
      return;
    }
    const method = availablePaymentMethods.find(m => m.id === selectedPaymentMethodId);
    if (!method) {
      toast({ title: t('Common.error'), description: t('POSPage.paymentMethodNotFound'), variant: 'destructive' });
      return;
    }

    if (amount > amountRemainingToPay + 0.001) { 
      toast({ title: t('Common.error'), description: t('POSPage.paymentExceedsTotal', { amount: formatCurrency(amountRemainingToPay, paymentCurrency) }), variant: 'destructive' });
      return;
    }

    setCurrentAppliedPayments(prev => [...prev, { methodId: method.id, methodName: method.name, amount }]);
    setPaymentAmountInput(Math.max(0, amountRemainingToPay - amount).toFixed(paymentCurrency.decimalPlaces));
  };

  const handleRemoveAppliedPayment = (index: number) => {
    setCurrentAppliedPayments(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddSelectedTax = () => {
    if (!selectedTaxToAddId) {
      toast({ title: t('Common.error'), description: t('POSPage.noTaxSelectedError'), variant: 'destructive' });
      return;
    }
    const taxInfo = availableTaxes.find(tax => tax.id === selectedTaxToAddId);
    if (!taxInfo) {
      toast({ title: t('Common.error'), description: 'Selected tax not found.', variant: 'destructive' });
      return;
    }

    const isAlreadyApplied = appliedTaxDefinitions.some(appliedTaxDef => appliedTaxDef.id === taxInfo.id);
    if (isAlreadyApplied) {
      toast({ title: t('Common.error'), description: t('POSPage.taxAlreadyAppliedError'), variant: 'destructive' });
      return;
    }

    const newTaxDefinition: AppliedTaxDefinition = {
      id: taxInfo.id,
      name: taxInfo.name,
      rate: taxInfo.rate,
    };
    setAppliedTaxDefinitions(prev => [...prev, newTaxDefinition]);
    toast({ title: t('Toasts.taxAddedTitle'), description: t('Toasts.taxAddedDescription', { taxName: taxInfo.name }) });
    setSelectedTaxToAddId(''); 
  };

  const handleRemoveAppliedTax = (taxIdToRemove: string) => {
    const removedTaxDef = appliedTaxDefinitions.find(t => t.id === taxIdToRemove);
    setAppliedTaxDefinitions(prev => prev.filter(taxDef => taxDef.id !== taxIdToRemove));
    if (removedTaxDef) {
      toast({
        title: t('Toasts.taxRemovedTitle'),
        description: t('Toasts.taxRemovedDescription', { taxName: removedTaxDef.name }),
      });
    }
  };
  
  const handleSaveForCheckout = async () => {
    if (cart.length === 0) {
        toast({ variant: "destructive", title: t('Toasts.emptyCartTitle'), description: t('POSPage.saveCartEmptyError') });
        return;
    }
    if (!paymentCurrency || !baseCurrency) return;
    setIsSavingCart(true);
    
    const client = clients.find(c => c.id === selectedClientId);
    let cartName = client ? client.name : t('POSPage.walkInCustomer');
    cartName += ` - ${new Date().toLocaleTimeString()}`;

    const itemsForDb = cart.map(item => ({
        productId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category: item.category,
        imageUrl: item.imageUrl,
        barcode: item.barcode,
        itemDiscountType: item.itemDiscountType,
        itemDiscountValue: item.itemDiscountValue,
        dispatchedQuantity: item.dispatchedQuantity,
    }));

    const pendingCartData: Omit<PendingCart, 'id' | 'createdAt' | 'updatedAt'> = {
        cartName,
        items: itemsForDb,
        clientId: selectedClientId,
        clientName: client?.name,
        subtotal: subtotalFromOriginalPrices,
        totalItemDiscountAmount,
        overallDiscountType,
        overallDiscountValue: overallDiscountValue ? parseFloat(overallDiscountValue) : undefined,
        overallDiscountAmountApplied,
        promotionalDiscountAmount,
        appliedPromotions: appliedPromotionsForDisplay,
        taxAmount,
        totalAmount: finalTotalAmount,
        appliedTaxes: taxBreakdownForDisplay,
        currencyCode: paymentCurrency.code,
        currencySymbol: paymentCurrency.symbol,
        currencyDecimalPlaces: paymentCurrency.decimalPlaces,
        baseCurrencyCode: baseCurrency.code,
        totalInBaseCurrency: finalTotalInBaseCurrency,
        exchangeRate: paymentCurrency.exchangeRate || 1,
    };
    
    try {
        const response = await fetch('/api/pending-carts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pendingCartData)
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to save cart for checkout.');
        }
        toast({ title: t('POSPage.saveCartSuccessTitle'), description: t('POSPage.saveCartSuccessDescription', { cartName: result.data.cartName }) });
        clearCart();
    } catch (error) {
        toast({ variant: 'destructive', title: t('Common.error'), description: error instanceof Error ? error.message : 'Error saving cart.' });
    } finally {
        setIsSavingCart(false);
    }
  };

  const handleProcessSaleClick = () => {
    if (cart.length === 0) {
      toast({ title: t('Toasts.emptyCartTitle'), description: t('Toasts.emptyCartDescription'), variant: "destructive" });
      return;
    }
    if (amountRemainingToPay > 0.001 && paymentCurrency) { 
      toast({ title: t('Common.error'), description: t('POSPage.amountRemainingError', { amount: formatCurrency(amountRemainingToPay, paymentCurrency) }), variant: 'destructive' });
      return;
    }
    if (currentAppliedPayments.length === 0) {
      toast({ title: t('Common.error'), description: t('POSPage.noPaymentMethodsAppliedError'), variant: 'destructive'});
      return;
    }
    finalizeSale(dispatchOnSale);
  };

  const finalizeSale = async (shouldDispatchNow: boolean) => {
    if (!paymentCurrency || !baseCurrency) return;
    setIsProcessingPayment(true);

    const transactionClient = selectedClientId ? clients.find(c => c.id === selectedClientId) : undefined;

    const newTransactionData: Omit<SaleTransaction, 'id'> & { dispatchNow?: boolean } = {
      date: new Date().toISOString(),
      items: cart, 
      subtotal: subtotalFromOriginalPrices,
      totalItemDiscountAmount: totalItemDiscountAmount,
      overallDiscountType: overallDiscountType,
      overallDiscountValue: overallDiscountValue ? parseFloat(overallDiscountValue) : undefined,
      overallDiscountAmountApplied: overallDiscountAmountApplied,
      promotionalDiscountAmount: promotionalDiscountAmount,
      appliedPromotions: appliedPromotionsForDisplay,
      taxAmount: taxAmount,
      totalAmount: finalTotalAmount,
      appliedPayments: currentAppliedPayments,
      clientId: transactionClient?.id,
      clientName: transactionClient?.name,
      appliedTaxes: taxBreakdownForDisplay, 
      currencyCode: paymentCurrency.code,
      currencySymbol: paymentCurrency.symbol,
      currencyDecimalPlaces: paymentCurrency.decimalPlaces,
      baseCurrencyCode: baseCurrency.code,
      totalInBaseCurrency: finalTotalInBaseCurrency,
      exchangeRate: paymentCurrency.exchangeRate || 1,
      dispatchStatus: 'Pending', // Will be updated by backend if dispatchNow is true
      dispatchNow: shouldDispatchNow,
    };

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        const userEmail = localStorage.getItem('loggedInUserEmail');
        if (userEmail) headers['X-User-Email'] = userEmail;
      }
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(newTransactionData),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || t('POSPage.errorProcessingPayment'));
      }
      
      if (activePendingCartId) {
        await fetch(`/api/pending-carts/${activePendingCartId}`, { method: 'DELETE' });
        fetchPendingCarts();
      }

      toast({
        title: t('Toasts.paymentSuccessfulTitle'),
        description: t('Toasts.paymentSuccessfulDescription', { totalAmount: formatCurrency(result.data.totalAmount, paymentCurrency) })
      });
      clearCart(); 
      router.push(`/receipt/${result.data.id}`);

    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('POSPage.errorProcessingPaymentAPI'),
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleLiveSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBarcodeInput(value);
    if (!isContinuousScanMode && value.length >= MIN_CHARS_FOR_LIVE_SEARCH) {
      const results = products.filter(p =>
        p.name.toLowerCase().includes(value.toLowerCase()) ||
        p.barcode.toLowerCase().includes(value.toLowerCase())
      );
      setLiveSearchResults(results);
      setIsLiveSearchVisible(results.length > 0);
    } else {
      setLiveSearchResults([]);
      setIsLiveSearchVisible(false);
    }
  };

  const handleInputBlur = () => { setTimeout(() => setIsLiveSearchVisible(false), 150); };
  const handleInputFocus = () => { if (!isContinuousScanMode && barcodeInput.length >= MIN_CHARS_FOR_LIVE_SEARCH && liveSearchResults.length > 0) setIsLiveSearchVisible(true); };

  const handleLiveSearchResultClick = (product: Product) => {
    addProductToCart(product);
    setBarcodeInput('');
    setIsLiveSearchVisible(false);
  };
  
  const handlePaymentCurrencyChange = (currencyCode: string) => {
    const newCurrency = currencies.find(c => c.code === currencyCode);
    if(newCurrency) setPaymentCurrency(newCurrency);
  }
  
  const handleLoadPendingCart = (cartToLoad: PendingCart) => {
    clearCart();
    setActivePendingCartId(cartToLoad.id);
    
    // Correctly map the items to conform to the frontend CartItem type
    const cartItemsForState: CartItem[] = cartToLoad.items.map(dbItem => ({
        ...(dbItem as any), // Spread all properties from the db item
        id: dbItem.productId, // Ensure the 'id' field is populated from 'productId'
    }));
    setCart(cartItemsForState);

    setSelectedClientId(cartToLoad.clientId);
    setAppliedTaxDefinitions(cartToLoad.appliedTaxes.map(t => ({id: t.taxId, name: t.name, rate: t.rate })));
    setOverallDiscountType(cartToLoad.overallDiscountType);
    setOverallDiscountValue(cartToLoad.overallDiscountValue?.toString() || '');
    const newPaymentCurrency = currencies.find(c => c.code === cartToLoad.currencyCode);
    if (newPaymentCurrency) setPaymentCurrency(newPaymentCurrency);
    // Let calculateTotals handle the rest
    toast({ title: t('POSPage.cartLoadedTitle'), description: t('POSPage.cartLoadedDescription', { cartName: cartToLoad.cartName }) });
  };

  const formatCurrency = useCallback((amount: number, currency: Currency | null) => {
    if (!currency) return `${amount.toFixed(2)}`;
    return `${currency.symbol}${amount.toFixed(currency.decimalPlaces)}`;
  }, []);

  const currencyOptions = useMemo(() => 
    currencies.filter(c => c.isEnabled).map(c => ({
      value: c.code,
      label: `${c.name} (${c.code})`
    })), [currencies]);

  if (!hasPermission('access_pos_page')) {
    return <AccessDeniedMessage />;
  }

  const isLoadingData = isLoadingTranslations || isLoadingCurrencies || !paymentCurrency || !baseCurrency || isLoadingProducts || isLoadingSettings || isLoadingClients || isLoadingPromotions;

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,64px)-4rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const exchangeRate = paymentCurrency.exchangeRate || 1;
  
  const CartPanel = (
    <div className="flex flex-col gap-2 h-full">
      <Card className="shadow-lg shrink-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-xl">
            <ShoppingCart className="mr-2 h-6 w-6 text-primary" /> {t('POSPage.currentTransactionTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="relative">
            <div className="flex gap-2 items-center">
              <Input
                ref={continuousScanInputRef}
                type="text"
                placeholder={isContinuousScanMode ? t('POSPage.continuousScanPlaceholder') : t('POSPage.scanBarPlaceholder')}
                value={barcodeInput}
                onChange={handleLiveSearchInputChange}
                onKeyPress={(e) => e.key === 'Enter' && handleBarcodeScan(barcodeInput, isContinuousScanMode)}
                onBlur={handleInputBlur}
                onFocus={handleInputFocus}
                className="flex-grow"
                aria-label="Barcode or product search input"
              />
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button onClick={() => setIsScannerOpen(true)} variant="outline" size="icon" aria-label={t('POSPage.scanWithCameraButton')}>
                              <Camera className="h-5 w-5" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{t('POSPage.scanWithCameraButton')}</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                      <TooltipTrigger asChild>
                         <Button onClick={toggleContinuousScanMode} aria-label={isContinuousScanMode ? t('POSPage.disableContinuousScanButton') : t('POSPage.enableContinuousScanButton')} variant={isContinuousScanMode ? "secondary" : "default"} size="icon">
                              {isContinuousScanMode ? <Scan className="h-5 w-5" /> : <ScanLine className="h-5 w-5" />}
                         </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>{isContinuousScanMode ? t('POSPage.disableContinuousScanButton') : t('POSPage.enableContinuousScanButton')}</p></TooltipContent>
                  </Tooltip>
              </TooltipProvider>
            </div>
            {isContinuousScanMode && <Badge variant="outline" className="absolute top-full mt-1.5 left-0 text-xs py-0.5 px-1.5 bg-accent text-accent-foreground">{t('POSPage.scanModeActiveIndicator')}</Badge>}
            {!isContinuousScanMode && isLiveSearchVisible && liveSearchResults.length > 0 && (
              <Card className="absolute z-20 w-full mt-1 shadow-xl max-h-60 overflow-y-auto border-input"><CardContent className="p-0">
                  {liveSearchResults.map(product => (
                    <div key={product.id} className="p-3 hover:bg-muted cursor-pointer flex justify-between items-center border-b last:border-b-0" onClick={() => handleLiveSearchResultClick(product)} onMouseDown={(e) => e.preventDefault()}>
                      <div><p className="font-medium">{product.name}</p><p className="text-sm text-muted-foreground">Barcode: {product.barcode}</p></div>
                      <p className="text-sm text-primary">{formatCurrency(product.price * exchangeRate, paymentCurrency)}</p>
                    </div>))}
              </CardContent></Card>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl flex flex-col flex-grow overflow-hidden min-h-[320px] sm:min-h-[500px]">
        <CardContent className="p-0 flex-grow overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[280px]">
                  <p className="text-center text-muted-foreground">{t('POSPage.cartEmpty')}</p>
                </div>
              ) : (
                cart.map(item => (<CartItemCard 
                    key={item.id} 
                    item={item} 
                    onUpdateQuantity={updateQuantity} 
                    onRemoveItem={handleRequestRemoveItem} 
                    onUpdateItemDiscount={handleUpdateItemDiscount} 
                    paymentCurrency={paymentCurrency} 
                  />))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
  
  const PaymentPanel = ({ isSeparate }: { isSeparate: boolean }) => (
     <Card className="shadow-xl h-full flex flex-col">
          <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline text-lg">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  {isSeparate ? t('POSPage.paymentTitle') : t('POSPage.summaryAndPaymentTitle')}
              </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm flex-grow overflow-y-auto">
              <div className="space-y-3">
                <div>
                    <h3 className="text-md font-semibold flex items-center mb-1"><User className="mr-2 h-5 w-5 text-primary" />{t('POSPage.clientSectionTitle')}</h3>
                    {isLoadingClients ? <div className="flex justify-start items-center h-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
                    <Select value={selectedClientId} onValueChange={(value) => setSelectedClientId(value === "walk-in" ? undefined : value)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder={t('POSPage.selectClientPlaceholder')} /></SelectTrigger>
                    <SelectContent><SelectItem value="walk-in">{t('POSPage.walkInCustomer')}</SelectItem>{clients.map(client => (<SelectItem key={client.id} value={client.id}>{client.name} ({client.email})</SelectItem>))}</SelectContent>
                    </Select>)}
                </div>
                <div>
                    <h3 className="text-md font-semibold flex items-center mb-1"><Landmark className="mr-2 h-5 w-5 text-primary" />{t('Header.selectCurrencyLabel')}</h3>
                      <Combobox 
                        options={currencyOptions}
                        value={paymentCurrency?.code}
                        onChange={handlePaymentCurrencyChange}
                        placeholder={t('Header.selectCurrencyLabel')}
                        searchPlaceholder={t('CurrencyManager.searchPlaceholder')}
                        emptyResultText={t('CurrencyManager.noResults')}
                      />
                </div>
              </div>
              <Separator />

              <div className="space-y-1">
                <div className="flex justify-between"><span>{t('POSPage.originalSubtotalLabel')}</span><span>{formatCurrency(subtotalFromOriginalPrices * exchangeRate, paymentCurrency)}</span></div>
                
                {totalItemDiscountAmount > 0 && (<>
                    <div className="flex justify-between text-destructive"><span>{t('POSPage.totalItemDiscountLabel')}</span><span>-{formatCurrency(totalItemDiscountAmount * exchangeRate, paymentCurrency)}</span></div>
                    <div className="flex justify-between font-medium"><span>{t('POSPage.subtotalAfterItemDiscountsLabel')}</span><span>{formatCurrency(subtotalAfterItemDiscounts * exchangeRate, paymentCurrency)}</span></div>
                </>)}
                
                <div className="space-y-1.5 pt-1">
                    <h4 className="text-xs font-semibold flex items-center text-muted-foreground"><PercentSquare className="mr-1.5 h-3.5 w-3.5"/>{t('POSPage.overallSaleDiscountSectionTitle')}</h4>
                    <div className="grid grid-cols-[1fr_100px] gap-2 items-end">
                         <Select value={overallDiscountType} onValueChange={(value) => setOverallDiscountType(value as 'percentage' | 'fixedAmount' | undefined)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t('POSPage.discountTypePlaceholder')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="percentage" className="text-xs">{t('POSPage.discountTypePercentage')}</SelectItem>
                                <SelectItem value="fixedAmount" className="text-xs">{t('POSPage.discountTypeFixedAmount')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input type="number" placeholder={t('POSPage.discountValuePlaceholder')} value={overallDiscountValue} onChange={e => setOverallDiscountValue(e.target.value)} className="h-8 text-xs" step="0.01" min="0" disabled={!overallDiscountType}/>
                    </div>
                     {overallDiscountAmountApplied > 0 && (
                        <div className="flex justify-between text-destructive text-xs"><span>{t('POSPage.overallDiscountAppliedLabel')}</span><span>-{formatCurrency(overallDiscountAmountApplied * exchangeRate, paymentCurrency)}</span></div>
                    )}
                </div>
                
                {(totalItemDiscountAmount > 0 || overallDiscountAmountApplied > 0) && (
                    <div className="flex justify-between font-medium"><span>{t('POSPage.subtotalBeforePromotionsLabel')}</span><span>{formatCurrency(subtotalBeforePromotions * exchangeRate, paymentCurrency)}</span></div>
                )}

                {promotionalDiscountAmount > 0 && (<>
                    <div className="flex justify-between text-destructive"><span>{t('POSPage.promotionalDiscountLabel')}</span><span>-{formatCurrency(promotionalDiscountAmount * exchangeRate, paymentCurrency)}</span></div>
                    {appliedPromotionsForDisplay.length > 0 && (<div className="pl-2 text-xs text-muted-foreground">{t('POSPage.promotionsAppliedTitle')}: {appliedPromotionsForDisplay.map(p => p.name).join(', ')}</div>)}
                </>)}
                
                <div className="flex justify-between"><span>{t('POSPage.taxableAmountLabel')}</span><span>{formatCurrency(taxableAmount * exchangeRate, paymentCurrency)}</span></div>

                <div className="pt-1 space-y-2">
                    <h4 className="text-xs font-semibold flex items-center text-muted-foreground"><Percent className="mr-1.5 h-3.5 w-3.5" />{t('POSPage.taxSectionTitle')}</h4>
                    {isLoadingTaxes ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : (
                        <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                          <Select value={selectedTaxToAddId} onValueChange={setSelectedTaxToAddId}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t('POSPage.selectTaxPlaceholder')} /></SelectTrigger>
                              <SelectContent>
                              {availableTaxes.map(tax => (<SelectItem key={tax.id} value={tax.id} className="text-xs">{tax.name} ({(tax.rate * 100).toFixed(0)}%)</SelectItem>))}
                              </SelectContent>
                          </Select>
                          <Button onClick={handleAddSelectedTax} size="sm" className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-2 py-1 h-8 text-xs">
                              <Plus className="h-3.5 w-3.5 mr-1"/> {t('POSPage.addTaxButton')}
                          </Button>
                        </div>
                    )}
                    {taxBreakdownForDisplay.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {taxBreakdownForDisplay.map(taxEntry => (
                          <Badge key={taxEntry.id} variant="outline" className="flex justify-between items-center py-1 px-2 w-full text-xs">
                            <span>{taxEntry.name} ({(taxEntry.rate * 100).toFixed(0)}%): {formatCurrency(taxEntry.amount * exchangeRate, paymentCurrency)}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveAppliedTax(taxEntry.id)} className="h-4 w-4 p-0.5 hover:bg-destructive/10">
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                </div>
                
                <div className="flex justify-between pt-0.5">
                    <span>{t('POSPage.totalTaxLabel')}</span>
                    <span>{formatCurrency(taxAmount * exchangeRate, paymentCurrency)}</span>
                </div>

                <Separator className="my-1.5" />
                <div className="flex justify-between font-semibold text-lg text-primary"><span>{t('POSPage.totalLabel')}</span><span>{formatCurrency(finalTotalAmount, paymentCurrency)}</span></div>
              </div>
              <Separator />
              <div className="items-center flex space-x-2 pt-2">
                <Checkbox id="dispatch-now" checked={dispatchOnSale} onCheckedChange={(checked) => setDispatchOnSale(Boolean(checked))} />
                <Label htmlFor="dispatch-now" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1.5">
                    <Truck className="h-4 w-4"/>
                    {t('DispatchManager.dispatchNowButton')}
                </Label>
               </div>
              {cart.length > 0 && (
                <div className="space-y-2 mt-2">
                  <h3 className="text-md font-semibold flex items-center"><Wallet className="mr-2 h-5 w-5 text-primary" />{t('POSPage.paymentSectionTitle')}</h3>
                  {isLoadingPaymentMethods ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : (
                    <div className="grid grid-cols-2 gap-3 items-end">
                      <Select value={selectedPaymentMethodId} onValueChange={setSelectedPaymentMethodId}>
                        <SelectTrigger className="h-9"><SelectValue placeholder={t('POSPage.selectPaymentMethodPlaceholder')} /></SelectTrigger>
                        <SelectContent>
                          {availablePaymentMethods.map(method => (<SelectItem key={method.id} value={method.id}>{method.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <Input type="number" placeholder={t('POSPage.paymentAmountPlaceholder')} value={paymentAmountInput} onChange={(e) => setPaymentAmountInput(e.target.value)} step="0.01" min="0.01" className="h-9"/>
                      <Button onClick={handleAddPayment} disabled={isProcessingPayment || !paymentAmountInput || !selectedPaymentMethodId || parseFloat(paymentAmountInput) <= 0} className="col-span-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground h-9">
                        {t('POSPage.addPaymentButton')}
                      </Button>
                    </div>
                  )}
                  {currentAppliedPayments.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{t('POSPage.appliedPaymentsTitle')}:</p>
                      {currentAppliedPayments.map((payment, index) => (
                        <Badge key={index} variant="outline" className="flex justify-between items-center py-1 px-2 w-full text-xs">
                          <span>{payment.methodName}: {formatCurrency(payment.amount, paymentCurrency)}</span>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveAppliedPayment(index)} className="h-4 w-4 p-0.5 hover:bg-destructive/10">
                            <X className="h-3 w-3 text-destructive" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-medium">
                    <span>{t('POSPage.totalPaidLabel')}</span>
                    <span>{formatCurrency(totalPaidAmount, paymentCurrency)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-accent">
                    <span>{t('POSPage.amountRemainingLabel')}</span>
                    <span>{formatCurrency(amountRemainingToPay, paymentCurrency)}</span>
                  </div>
                </div>
              )}
          </CardContent>
          <CardFooter className="flex gap-2 mt-2 border-t pt-4 shrink-0">
              {useSeparatePanels ? (
                  <Button onClick={handleProcessSaleClick} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={cart.length === 0 || isProcessingPayment || !hasPermission('process_payment_action')}>
                    {isProcessingPayment ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <DollarSign className="mr-2 h-5 w-5" />}
                    {isProcessingPayment ? t('POSPage.processingPaymentButton') : t('POSPage.processPaymentButton')}
                 </Button>
              ) : (
                <>
                    <Button variant="outline" onClick={clearCart} className="w-full" disabled={isProcessingPayment || !hasPermission('clear_cart_action')}>{isProcessingPayment ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Trash2 className="mr-2 h-5 w-5" />} {t('POSPage.clearCartButton')}</Button>
                    <Button onClick={handleProcessSaleClick} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={cart.length === 0 || isProcessingPayment || !hasPermission('process_payment_action')}>
                        {isProcessingPayment ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <DollarSign className="mr-2 h-5 w-5" />}
                        {isProcessingPayment ? t('POSPage.processingPaymentButton') : t('POSPage.processPaymentButton')}
                    </Button>
                </>
              )}
          </CardFooter>
      </Card>
  );

  return (
    <>
      {useSeparatePanels ? (
        <Tabs value={activeTab} className="w-full">
          {/* TabsList is removed for sidebar-only navigation */}
          <TabsContent value="cart" className="mt-0">
            <div className="flex flex-col gap-2">
                <Button onClick={handleSaveForCheckout} className="w-full mb-2 bg-primary hover:bg-primary/90" disabled={cart.length === 0 || isSavingCart}>
                    {isSavingCart ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                    {t('POSPage.saveForCheckoutButton')}
                </Button>
                {CartPanel}
            </div>
          </TabsContent>
          <TabsContent value="payment" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-var(--header-height,64px)-8rem)]">
                <PendingCartsList 
                    carts={pendingCarts}
                    isLoading={isLoadingPendingCarts}
                    onSelectCart={handleLoadPendingCart}
                    activeCartId={activePendingCartId}
                />
                <div className="flex flex-col h-full">
                    <PaymentPanel isSeparate={true} />
                </div>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 flex flex-col gap-2">
            {CartPanel}
          </div>
          <div className="lg:col-span-1 flex flex-col">
            <PaymentPanel isSeparate={false} />
          </div>
        </div>
      )}
      
      <BarcodeScannerDialog
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScanSuccess={handleCameraScanSuccess}
      />
      <AuthorizationDialog
        open={isAuthDialogOpen}
        onOpenChange={setIsAuthDialogOpen}
        onSuccess={handleAuthorizationSuccess}
      />
    </>
  );
}
