'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import ReceiptView from '@/components/receipt/ReceiptView';
import type { SaleTransaction, ReceiptSetting } from '@/types'; 
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function ReceiptPage() {
  const params = useParams();
  const transactionId = params.id as string;
  const [transaction, setTransaction] = useState<SaleTransaction | undefined>(undefined);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSetting | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const { toast } = useToast();

  const fetchData = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const [transactionResponse, settingsResponse] = await Promise.all([
        fetch(`/api/sales/${id}`),
        fetch('/api/receipt-settings')
      ]);

      if (!transactionResponse.ok) {
        if (transactionResponse.status === 404) {
          setTransaction(undefined);
           toast({
            variant: 'destructive',
            title: t('ReceiptView.notFoundTitle'),
            description: t('ReceiptView.notFoundMessageApi'),
          });
        } else {
          throw new Error('Failed to fetch transaction');
        }
      } else {
        const transactionResult = await transactionResponse.json();
        if (transactionResult.success) {
          setTransaction(transactionResult.data);
        } else {
          throw new Error(transactionResult.error || 'Failed to fetch transaction details');
        }
      }

      if (!settingsResponse.ok) {
        throw new Error('Failed to fetch receipt settings');
      }
      const settingsResult = await settingsResponse.json();
      if (settingsResult.success) {
        setReceiptSettings(settingsResult.data);
      } else {
        throw new Error(settingsResult.error || 'Failed to parse receipt settings');
      }

    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('ReceiptView.errorFetchingTransactionOrSettings'),
      });
      setTransaction(undefined);
      setReceiptSettings(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    if (transactionId && !isLoadingTranslations) {
      fetchData(transactionId);
    } else if (!transactionId) {
      setIsLoading(false); 
      setTransaction(undefined);
      setReceiptSettings(undefined);
    }
  }, [transactionId, fetchData, isLoadingTranslations]);

  if (isLoadingTranslations || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">{isLoadingTranslations ? '...' : t('ReceiptView.loadingReceipt')}</p>
      </div>
    );
  }

  return (
    <ReceiptView transaction={transaction} settings={receiptSettings} />
  );
}
