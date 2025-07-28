import { getLocale, getMessages, unstable_setRequestLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import AppLayout from '@/components/layout/AppLayout';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n-config';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: {
    locale: string;
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = params;

  if (!locales.includes(locale)) {
    notFound();
  }
  
  // Enable static rendering
  unstable_setRequestLocale(locale);

  const messages = await getMessages();
  
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
    </NextIntlClientProvider>
  );
}
