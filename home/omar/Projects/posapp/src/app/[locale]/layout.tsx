
import type { ReactNode } from 'react';
import { locales } from '@/i18n-config';
import { unstable_setRequestLocale } from 'next-intl/server';

// This function tells Next.js which locales to statically generate.
export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

// This layout now just sets the locale and passes children through.
// The main internationalization provider and other layout components
// are now handled by the root layout at src/app/layout.tsx.
export default function LocaleLayout({
  children,
  params: {locale},
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  // This is the key to enabling static rendering for a specific locale.
  unstable_setRequestLocale(locale);

  return <>{children}</>;
}
