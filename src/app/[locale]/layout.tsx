
'use client';

import { NextIntlClientProvider, useLocale, useMessages } from 'next-intl';
import AppLayout from '@/components/layout/AppLayout';

export default function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  const messages = useMessages();
 
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
        <AppLayout>
          {children}
        </AppLayout>
    </NextIntlClientProvider>
  );
}
