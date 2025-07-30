
'use client';

import { NextIntlClientProvider, useLocale, useMessages } from 'next-intl';
import AppLayout from '@/components/layout/AppLayout';

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = useMessages();
  const locale = useLocale();
 
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
        <AppLayout>
          {children}
        </AppLayout>
    </NextIntlClientProvider>
  );
}
