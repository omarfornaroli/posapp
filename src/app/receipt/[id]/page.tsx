// This file was moved from src/app/[locale]/receipt/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import type { SaleTransaction, ReceiptSetting } from '@/types';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import ReceiptView from '@/components/receipt/ReceiptView';
import { Loader2 } from 'lucide-react';
import { useDexieReceiptSettings } from '@/hooks/useDexieReceiptSettings';
import { db } from '@/lib/dexie-db';

export default function ReceiptPage() {
  const params = useParams();
  const { id } = params;
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { receiptSettings, isLoading: isLoadingSettings } = useDexieReceiptSettings();
  const [transaction, setTransaction] = useState<SaleTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  useEffect(() => {
    async function fetchTransactionFromDexie() {
      if (!id || typeof id !== 'string') {
        setError(t('ReceiptView.notFoundTitle'));
        setIsLoading(false);
        return;
      }
      try {
        const sale = await db.sales.get(id);
        if (sale) {
          setTransaction(sale);
        } else {
           throw new Error(t('ReceiptView.notFoundMessageApi'));
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t('ReceiptView.errorFetchingTransaction');
        setError(errorMessage);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTransactionFromDexie();
  }, [id, t]);

  const totalLoading = isLoading || isLoadingTranslations || isLoadingSettings;

  if (totalLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-destructive py-8">{error}</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <ReceiptView transaction={transaction || undefined} settings={receiptSettings || undefined} />
    </div>
  );
}
