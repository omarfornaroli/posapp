
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, unstable_setRequestLocale } from 'next-intl/server';
import AppLayout from '@/components/layout/AppLayout';
import type { Theme } from '@/types';
import dbConnect from '@/lib/dbConnect';
import ThemeModel from '@/models/Theme';
import '@/app/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CurrencyProvider } from '@/context/CurrencyContext';

const minimalFallbackTheme: Theme = {
  id: 'fallback-light',
  name: 'Fallback Light',
  isDefault: true,
  colors: { 
    background: "240 5.3% 94.9%", foreground: "240 10% 3.9%", card: "0 0% 100%", cardForeground: "240 10% 3.9%",
    popover: "0 0% 100%", popoverForeground: "240 10% 3.9%", primary: "270 100% 50%", primaryForeground: "0 0% 100%", 
    secondary: "240 4.8% 95.9%", secondaryForeground: "240 5.9% 10%", muted: "240 4.8% 95.9%", mutedForeground: "240 3.8% 46.1%",
    accent: "300 100% 50%", accentForeground: "0 0% 100%", destructive: "0 84.2% 60.2%", destructiveForeground: "0 0% 98%",
    border: "240 5.9% 90%", input: "240 5.9% 90%", ring: "270 100% 50%",
  },
  fontBody: 'Inter', fontHeadline: 'Poppins',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function getDefaultTheme(): Promise<Theme> {
  try {
    const connection = await dbConnect();
    if (!connection) {
      console.warn("[PANOX RootLayout] No database connection. Using fallback theme.");
      return minimalFallbackTheme;
    }
    
    let defaultThemeDoc = await ThemeModel.findOne({ isDefault: true }).lean();
    if (!defaultThemeDoc) {
      defaultThemeDoc = await ThemeModel.findOne({ name: 'Light' }).lean() || await ThemeModel.findOne().sort({ createdAt: 1 }).lean();
    }
    if (!defaultThemeDoc) return minimalFallbackTheme;
    const theme = JSON.parse(JSON.stringify(defaultThemeDoc)) as Theme;
    if (defaultThemeDoc._id && !theme.id) theme.id = defaultThemeDoc._id.toString();
    theme.fontBody = theme.fontBody || 'Inter';
    theme.fontHeadline = theme.fontHeadline || 'Poppins';
    return theme;
  } catch (error) {
    console.error("[PANOX RootLayout] Error fetching default theme. Returning minimal fallback. Error:", error);
    return minimalFallbackTheme;
  }
}

function ThemeStyleInjector({ theme }: { theme: Theme }) {
  const t = theme.colors;
  const bodyFontFamily = theme.fontBody || 'Inter';
  const headlineFontFamily = theme.fontHeadline || 'Poppins';
  const fontBody = bodyFontFamily.includes(' ') ? `'${bodyFontFamily}'` : bodyFontFamily;
  const fontHeadline = headlineFontFamily.includes(' ') ? `'${headlineFontFamily}'` : headlineFontFamily;
  
  const cssVariables = `
    :root {
      --background: ${t.background}; --foreground: ${t.foreground}; --card: ${t.card}; --card-foreground: ${t.cardForeground};
      --popover: ${t.popover}; --popover-foreground: ${t.popoverForeground}; --primary: ${t.primary}; --primary-foreground: ${t.primaryForeground};
      --secondary: ${t.secondary}; --secondary-foreground: ${t.secondaryForeground}; --muted: ${t.muted}; --muted-foreground: ${t.mutedForeground};
      --accent: ${t.accent}; --accent-foreground: ${t.accentForeground}; --destructive: ${t.destructive}; --destructive-foreground: ${t.destructiveForeground};
      --border: ${t.border}; --input: ${t.input}; --ring: ${t.ring};
      --font-body: ${fontBody}, sans-serif; --font-headline: ${fontHeadline}, sans-serif;
    }
  `;
  return <style dangerouslySetInnerHTML={{ __html: cssVariables.replace(/\s\s+/g, ' ').trim() }} />;
}

export const metadata = {
  title: 'POSAPP',
  description: 'Modern Point of Sale application',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  unstable_setRequestLocale(locale);
  const messages = await getMessages();
  const activeTheme = await getDefaultTheme();

  return (
    <html lang={locale}>
      <head>
        <ThemeStyleInjector theme={activeTheme} /> 
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8a2be2" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat&family=Lobster&family=Pacifico&family=Roboto+Slab&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
           <AuthProvider value={{ user: null }}>
             <CurrencyProvider>
                <AppLayout>
                  {children}
                </AppLayout>
              </CurrencyProvider>
           </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

    