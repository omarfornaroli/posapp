import type { ReactNode } from 'react';
import '@/app/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CurrencyProvider } from '@/context/CurrencyContext';

// This is the root layout. It's minimal and wraps all pages.
// Internationalization and the main app UI are handled in [locale]/layout.tsx.

export const metadata = {
  title: 'POSAPP',
  description: 'Modern Point of Sale application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
       <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8000FF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat&family=Lobster&family=Pacifico&family=Roboto+Slab&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {/* AuthProvider and other global providers that do not depend on `next-intl` can be here */}
        <AuthProvider value={{ user: null }}>
          <CurrencyProvider>
            {children}
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
