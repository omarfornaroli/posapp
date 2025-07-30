import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import AppLayout from '@/components/layout/AppLayout';
import type { Theme } from '@/types';
import dbConnect from '@/lib/dbConnect';
import ThemeModel from '@/models/Theme';
 
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

export default async function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  const messages = await getMessages();
  const activeTheme = await getDefaultTheme();
 
  return (
    <>
      <ThemeStyleInjector theme={activeTheme} />
      <NextIntlClientProvider locale={locale} messages={messages}>
        <AppLayout>
          {children}
        </AppLayout>
      </NextIntlClientProvider>
    </>
  );
}
