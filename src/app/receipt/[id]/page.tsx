

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie-db';
import ReceiptView from '@/components/receipt/ReceiptView';
import type { SaleTransaction, ReceiptSetting } from '@/types'; 
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useDexieReceiptSettings } from '@/hooks/useDexieReceiptSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReceiptPage() {
  const params = useParams();
  const transactionId = params.id as string;
  
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  const transaction = useLiveQuery(
    () => transactionId ? db.sales.get(transactionId) : Promise.resolve(undefined),
    [transactionId]
  ) as SaleTransaction | undefined;
  
  const { receiptSettings, isLoading: isLoadingSettings } = useDexieReceiptSettings();
  const { toast } = useToast();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  const isLoading = isLoadingTranslations || isLoadingSettings || transaction === undefined;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">{isLoadingTranslations ? '...' : t('ReceiptView.loadingReceipt')}</p>
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

  return (
    <ReceiptView transaction={transaction} settings={receiptSettings || undefined} />
  );
}
