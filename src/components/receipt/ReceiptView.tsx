

'use client';

import { useEffect } from 'react';
import type { SaleTransaction, AppliedPayment, ReceiptSetting, ReceiptMargin, AppliedTaxEntry } from '@/types'; 
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Printer, Share2, User, Tag, CreditCard, Building, MapPin, Phone, Loader2, PercentSquare } from 'lucide-react';
import Image from 'next/image';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useToast } from '@/hooks/use-toast'; 

interface ReceiptViewProps {
  transaction?: SaleTransaction;
  settings?: ReceiptSetting; 
}

export default function ReceiptView({ transaction, settings }: ReceiptViewProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const { toast } = useToast(); 

  const defaultLogoUrl = "https://placehold.co/100x40.png";
  const logoUrl = settings?.logoUrl ? settings.logoUrl : defaultLogoUrl;
  
  const effectiveCompanyName = settings?.showCompanyName && settings.companyName ? settings.companyName : undefined;
  const effectiveCompanyAddress = settings?.showCompanyAddress && settings.companyAddress ? settings.companyAddress : undefined;
  const effectiveCompanyPhone = settings?.showCompanyPhone && settings.companyPhone ? settings.companyPhone : undefined;

  const getReceiptPadding = (marginSetting?: ReceiptMargin): string => {
    switch (marginSetting) {
      case 'none': return '0px';
      case 'small': return '5px';
      case 'medium': return '10px';
      case 'large': return '15px';
      default: return '5px'; 
    }
  };
  const receiptPadding = getReceiptPadding(settings?.receiptMargin);

  const currencySymbol = transaction?.currencySymbol || '$';
  const currencyDecimalPlaces = transaction?.currencyDecimalPlaces !== undefined ? transaction.currencyDecimalPlaces : 2;

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toFixed(currencyDecimalPlaces)}`;
  };

  if (isLoadingTranslations) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <Card className="w-full max-w-md mx-auto mt-10 shadow-xl print:shadow-none print:border-none print:mt-0">
        <CardHeader>
          <CardTitle className="font-headline text-center text-destructive">{t('ReceiptView.notFoundTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">{t('ReceiptView.notFoundMessage')}</p>
        </CardContent>
      </Card>
    );
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && transaction) {
      try {
        await navigator.share({
          title: `${t('ReceiptView.transactionIdLabel')} ${transaction.id}`,
          text: `${t('ReceiptView.thankYouMessage')} ${effectiveCompanyName || t('ReceiptView.ourStoreDefault')} ${t('ReceiptView.transactionIdLabel')} ${transaction.id}. ${t('ReceiptView.totalLabel')} ${formatCurrency(transaction.totalAmount)}`,
          url: typeof window !== 'undefined' ? window.location.href : '',
        });
      } catch (error) {
        console.error('Error sharing receipt:', error);
        let description = t('ReceiptView.shareFailedError'); 

        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          description = t('ReceiptView.sharePermissionDenied');
        } else if (error instanceof Error && error.message.toLowerCase().includes('permission denied')) {
          description = t('ReceiptView.sharePermissionDenied'); 
        }
        
        toast({
          variant: 'destructive',
          title: t('ReceiptView.shareErrorTitle'),
          description: description,
        });
      }
    } else {
      if (typeof window !== 'undefined') { 
         toast({
            variant: 'destructive',
            title: t('ReceiptView.shareErrorTitle'),
            description: t('ReceiptView.shareNotSupportedError'),
          });
      }
    }
  };
  
  const subtotalAfterItemDiscounts = transaction.subtotal - (transaction.totalItemDiscountAmount || 0);
  const subtotalAfterOverallDiscount = subtotalAfterItemDiscounts - (transaction.overallDiscountAmountApplied || 0);
  const taxableAmount = subtotalAfterOverallDiscount - (transaction.promotionalDiscountAmount || 0);

  const printStyles = `
    @media print {
      body * { visibility: hidden !important; margin: 0 !important; padding: 0 !important; }
      html, body { width: auto !important; height: auto !important; background-color: #fff !important; }
      .printable-receipt-area, .printable-receipt-area * { visibility: visible !important; }
      .printable-receipt-area { position: absolute !important; left: 0 !important; top: 0 !important; right: 0 !important; margin: 0 auto !important; padding: ${receiptPadding} !important; box-shadow: none !important; border: none !important; background-color: #fff !important; font-size: ${settings?.receiptWidth === '58mm' ? '9pt' : '10pt'} !important; -webkit-print-color-adjust: exact !important; color-adjust: exact !important; width: ${settings?.receiptWidth === '80mm' ? '80mm' : settings?.receiptWidth === '58mm' ? '58mm' : '100%'} !important; max-width: ${settings?.receiptWidth === '80mm' ? '80mm' : settings?.receiptWidth === '58mm' ? '58mm' : '100%'} !important; }
      .printable-receipt-area .print-hidden-section { display: none !important; }
      .printable-receipt-area img.print-logo-filter { filter: grayscale(1) opacity(0.7) !important; }
      .printable-receipt-area .bg-card { background-color: #fff !important; }
      .printable-receipt-area .text-card-foreground { color: #000 !important; }
      .printable-receipt-area .text-primary { color: hsl(var(--primary)) !important; } 
      .printable-receipt-area .text-muted-foreground { color: #555 !important; } 
      .printable-receipt-area .border-t, .printable-receipt-area .border-b, .printable-receipt-area .border, .printable-receipt-area hr, .printable-receipt-area ${Separator} { border-color: #ccc !important; }
      .printable-receipt-area .text-destructive { color: #b00 !important; } 
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <Card className="printable-receipt-area w-full mx-auto bg-card text-card-foreground">
        <CardHeader className="text-center">
          {settings?.logoUrl && (
            <div className="flex justify-center mb-4 h-12 items-center">
              <Image 
                  src={logoUrl} 
                  alt={t('ReceiptView.logoAlt')} 
                  width={150} 
                  height={50} 
                  data-ai-hint="company logo"
                  className="print-logo-filter object-contain max-h-full"
                  onError={(e) => { 
                    const target = e.target as HTMLImageElement;
                    if (target.src !== defaultLogoUrl) { 
                      target.src = defaultLogoUrl; 
                    } else {
                       target.style.display = 'none'; 
                    }
                  }}
                />
            </div>
          )}
          {effectiveCompanyName && <CardTitle className="font-headline text-2xl">{effectiveCompanyName}</CardTitle>}
          {effectiveCompanyAddress && <p className="text-sm text-muted-foreground">{effectiveCompanyAddress}</p>}
          {effectiveCompanyPhone && <p className="text-sm text-muted-foreground">{effectiveCompanyPhone}</p>}
          
          {(!effectiveCompanyName && !settings?.logoUrl) && <CardTitle className="font-headline text-2xl">{t('ReceiptView.defaultReceiptTitle')}</CardTitle>}
          <p className="text-sm text-muted-foreground pt-1">{t('ReceiptView.thankYouMessage')}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs"><span className="font-semibold">{t('ReceiptView.transactionIdLabel')}</span> {transaction.id}</p>
            <p className="text-xs"><span className="font-semibold">{t('ReceiptView.dateLabel')}</span> {new Date(transaction.date).toLocaleString()}</p>
            {settings?.showClientInfo && transaction.clientName && (
              <p className="flex items-center text-xs">
                <User className="mr-1.5 h-3 w-3 text-muted-foreground" />
                <span className="font-semibold">{t('ReceiptView.clientLabel')}</span>&nbsp;{transaction.clientName}
              </p>
            )}
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold mb-1.5 font-headline text-base">{t('ReceiptView.itemsPurchasedLabel')}</h3>
            <ul className="space-y-1">
              {transaction.items.map(item => {
                let itemPrice = item.price;
                let itemDiscountText = "";
                if (item.itemDiscountType && typeof item.itemDiscountValue === 'number' && item.itemDiscountValue > 0) {
                  if (item.itemDiscountType === 'percentage') {
                    itemPrice = item.price * (1 - item.itemDiscountValue / 100);
                    itemDiscountText = ` (-${item.itemDiscountValue}%)`;
                  } else if (item.itemDiscountType === 'fixedAmount') {
                    itemPrice = Math.max(0, item.price - item.itemDiscountValue);
                    itemDiscountText = ` (-${formatCurrency(item.itemDiscountValue)})`;
                  }
                }
                return (
                  <li key={item.productId || item.barcode || item.name} className="flex justify-between text-xs"> 
                    <div>
                      <span>{item.name} (x{item.quantity})</span>
                       {itemDiscountText && <span className="text-destructive text-[10px]">{itemDiscountText}</span>}
                      {settings?.showItemBarcodes && item.barcode && <span className="block text-muted-foreground text-[10px]">SKU: {item.barcode}</span>}
                    </div>
                    <span>{formatCurrency(itemPrice * item.quantity)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <Separator />
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>{t('ReceiptView.originalSubtotalLabel')}</span>
              <span>{formatCurrency(transaction.subtotal)}</span>
            </div>
            
            {settings?.showDiscountSummary && transaction.totalItemDiscountAmount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>{t('ReceiptView.itemDiscountsLabel')}</span>
                <span>-{formatCurrency(transaction.totalItemDiscountAmount)}</span>
              </div>
            )}

            {(settings?.showDiscountSummary && transaction.totalItemDiscountAmount > 0) && (
                <div className="flex justify-between">
                  <span>{t('ReceiptView.subtotalAfterItemDiscountsLabel')}</span>
                  <span>{formatCurrency(subtotalAfterItemDiscounts)}</span>
                </div>
            )}
            
            {settings?.showDiscountSummary && transaction.overallDiscountAmountApplied && transaction.overallDiscountAmountApplied > 0 && (
              <div className="flex justify-between text-destructive">
                <span>{t('ReceiptView.overallSaleDiscountLabel')}</span>
                <span>-{formatCurrency(transaction.overallDiscountAmountApplied)}</span>
              </div>
            )}
            
            {(settings?.showDiscountSummary && (transaction.totalItemDiscountAmount > 0 || (transaction.overallDiscountAmountApplied && transaction.overallDiscountAmountApplied > 0))) && (
                <div className="flex justify-between">
                  <span>{t('ReceiptView.subtotalBeforePromotionsLabel')}</span>
                  <span>{formatCurrency(subtotalAfterOverallDiscount)}</span>
                </div>
            )}

            {settings?.showDiscountSummary && transaction.promotionalDiscountAmount && transaction.promotionalDiscountAmount > 0 && (
              <>
                <div className="flex justify-between text-destructive">
                  <span>{t('ReceiptView.promotionalDiscountLabel')}</span>
                  <span>-{formatCurrency(transaction.promotionalDiscountAmount)}</span>
                </div>
                {settings.showPromotionsApplied && transaction.appliedPromotions && transaction.appliedPromotions.length > 0 && (
                  <div className="pl-2 text-[10px] text-muted-foreground">
                    {transaction.appliedPromotions.map(p => p.name).join(', ')}
                  </div>
                )}
              </>
            )}
            
             <div className="flex justify-between">
                <span>{t('ReceiptView.taxableAmountLabel')}</span>
                <span>{formatCurrency(taxableAmount)}</span>
            </div>


            {transaction.appliedTaxes && transaction.appliedTaxes.map(tax => (
              <div key={tax.taxId} className="flex justify-between">
                <span>{tax.name} ({(tax.rate * 100).toFixed(0)}%)</span>
                <span>+{formatCurrency(tax.amount)}</span>
              </div>
            ))}
            {transaction.appliedTaxes && transaction.appliedTaxes.length > 0 && <Separator className="my-0.5" />}
            
            <div className="flex justify-between">
              <span className="font-semibold">{t('ReceiptView.totalTaxLabel')}</span>
              <span className="font-semibold">{formatCurrency(transaction.taxAmount)}</span>
            </div>

            <Separator className="my-0.5" />
            <div className="flex justify-between font-bold text-base text-primary">
              <span>{t('ReceiptView.totalLabel')}</span>
              <span>{formatCurrency(transaction.totalAmount)}</span>
            </div>
          </div>
          {settings?.showPaymentMethodsDetails && transaction.appliedPayments && transaction.appliedPayments.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-1 font-headline text-sm">{t('ReceiptView.paymentsMadeLabel')}</h3>
                <ul className="space-y-0.5 text-[10px]">
                  {transaction.appliedPayments.map((payment, index) => (
                    <li key={`${payment.methodId || 'payment'}-${payment.methodName}-${index}`} className="flex justify-between items-center"> 
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="h-2.5 w-2.5 text-muted-foreground"/>
                        {payment.methodName}
                      </span>
                      <span>{formatCurrency(payment.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
          {settings?.footerText && (
            <>
              <Separator />
              <div className="text-center text-[10px] text-muted-foreground pt-2">
                {settings.footerText.split('\\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-around gap-2 print-hidden-section pt-4">
          <Button variant="outline" onClick={handlePrint} className="w-full">
            <Printer className="mr-2 h-4 w-4" /> {t('ReceiptView.printButton')}
          </Button>
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
             <Button onClick={handleShare} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
               <Share2 className="mr-2 h-4 w-4" /> {t('ReceiptView.shareButton')}
             </Button>
          )}
        </CardFooter>
      </Card>
    </>
  );
}
