
import type { ReactNode } from 'react';
import {unstable_setRequestLocale} from 'next-intl/server';
import {locales} from '@/i18n-config';

// This function tells Next.js which locales to statically build
export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export default function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  // This validates the locale and enables static rendering for this page
  unstable_setRequestLocale(locale);

  // The AuthProvider and NextIntlProvider are now in the root layout,
  // so we just render children here.
  return <>{children}</>;
}
