
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, unstable_setRequestLocale, getLocale } from 'next-intl/server';
import AppLayout from '@/components/layout/AppLayout';
import {locales} from '@/i18n-config';

// This function is needed for static rendering of all locales
export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Enable static rendering
  unstable_setRequestLocale(locale);

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    // The html and body tags are in the root layout src/app/layout.tsx
    <NextIntlClientProvider locale={locale} messages={messages}>
        <AppLayout>
            {children}
        </AppLayout>
    </NextIntlClientProvider>
  );
}
