
import type { ReactNode } from 'react';
import { unstable_setRequestLocale } from 'next-intl/server';
import { locales } from '@/i18n-config';

// This function is needed for static rendering of all locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// This layout is now simplified. It only sets the locale for static rendering.
// The providers and main HTML structure are handled by the root layout.
export default function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Enable static rendering
  unstable_setRequestLocale(locale);

  return <>{children}</>;
}
