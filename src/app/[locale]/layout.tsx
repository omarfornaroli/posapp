
import type { ReactNode } from 'react';

// This layout is now a pass-through.
// Internationalization (NextIntlClientProvider, getMessages) is handled
// by the root layout at src/app/layout.tsx since localePrefix is 'never'.

// Removed generateStaticParams as it's not needed if this layout is just a pass-through
// and locale is handled by middleware and the root layout.

// Removed metadata as it's handled by the root layout.

export default function PassThroughLocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout should no longer be responsible for NextIntlClientProvider.
  // That is now handled by the root src/app/layout.tsx.
  // We just render children here.
  return <>{children}</>;
}
