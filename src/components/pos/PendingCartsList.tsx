
'use client';

import type { PendingCart } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ShoppingCart, User } from 'lucide-react';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface PendingCartsListProps {
  carts: PendingCart[];
  isLoading: boolean;
  onSelectCart: (cart: PendingCart) => void;
  activeCartId: string | null;
}

export default function PendingCartsList({ carts, isLoading, onSelectCart, activeCartId }: PendingCartsListProps) {
  const { t } = useRxTranslate();

  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline">{t('POSPage.pendingCartsTitle')}</CardTitle>
        <CardDescription>{t('POSPage.selectCartToCheckout')}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            {carts.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                <p>{t('POSPage.noPendingCarts')}</p>
              </div>
            ) : (
              carts.map(cart => (
                <Button
                  key={cart.id}
                  variant={activeCartId === cart.id ? 'secondary' : 'outline'}
                  className="w-full h-auto py-2 px-3 flex justify-between items-start text-left"
                  onClick={() => onSelectCart(cart)}
                >
                  <div className="flex-grow space-y-0.5">
                    <p className="font-semibold text-sm">{cart.cartName}</p>
                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                        <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{cart.clientName || t('POSPage.walkInCustomer')}</span>
                        </div>
                         <div className="flex items-center gap-1">
                            <ShoppingCart className="h-3 w-3" />
                            <span>{cart.items.length} {t(cart.items.length === 1 ? 'Items.singular' : 'Items.plural')}</span>
                         </div>
                    </div>
                  </div>
                   <div className="text-right shrink-0 ml-2">
                        <p className="font-bold text-base">{cart.currencySymbol}{cart.totalAmount.toFixed(cart.currencyDecimalPlaces)}</p>
                        <p className="text-xs text-muted-foreground">{cart.createdAt ? new Date(cart.createdAt).toLocaleTimeString() : ''}</p>
                   </div>
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
