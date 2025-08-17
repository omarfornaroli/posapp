
'use client';

import { useEffect, useState } from 'react';
import type { Theme } from '@/types';
import { useDexieThemes } from '@/hooks/useDexieThemes';

export default function ThemeStyleInjector() {
  const { themes, isLoading } = useDexieThemes();
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null);

  useEffect(() => {
    if (!isLoading && themes.length > 0) {
      const defaultTheme = themes.find(t => t.isDefault) || themes.find(t => t.name === 'Light') || themes[0];
      setActiveTheme(defaultTheme || null);
    }
  }, [themes, isLoading]);

  useEffect(() => {
    if (activeTheme) {
      const styleElement = document.createElement('style');
      styleElement.id = 'dynamic-theme-styles';
      
      const cssVariables = `
        :root {
          --font-body: '${activeTheme.fontBody}', sans-serif;
          --font-headline: '${activeTheme.fontHeadline}', sans-serif;
          
          --background: ${activeTheme.colors.background};
          --foreground: ${activeTheme.colors.foreground};
          --card: ${activeTheme.colors.card};
          --card-foreground: ${activeTheme.colors.cardForeground};
          --popover: ${activeTheme.colors.popover};
          --popover-foreground: ${activeTheme.colors.popoverForeground};
          --primary: ${activeTheme.colors.primary};
          --primary-foreground: ${activeTheme.colors.primaryForeground};
          --secondary: ${activeTheme.colors.secondary};
          --secondary-foreground: ${activeTheme.colors.secondaryForeground};
          --muted: ${activeTheme.colors.muted};
          --muted-foreground: ${activeTheme.colors.mutedForeground};
          --accent: ${activeTheme.colors.accent};
          --accent-foreground: ${activeTheme.colors.accentForeground};
          --destructive: ${activeTheme.colors.destructive};
          --destructive-foreground: ${activeTheme.colors.destructiveForeground};
          --border: ${activeTheme.colors.border};
          --input: ${activeTheme.colors.input};
          --ring: ${activeTheme.colors.ring};
        }
      `;
      
      styleElement.innerHTML = cssVariables.replace(/\s\s+/g, ' ').trim();
      
      const existingStyleElement = document.getElementById('dynamic-theme-styles');
      if (existingStyleElement) {
        document.head.removeChild(existingStyleElement);
      }
      
      document.head.appendChild(styleElement);
    }
  }, [activeTheme]);

  return null;
}
