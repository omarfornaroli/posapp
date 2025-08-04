'use client';

import Link from 'next/link';
import { Store, LogOut, Menu, Loader2, Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LanguageSwitcher from './LanguageSwitcher';
import CurrencySwitcher from './CurrencySwitcher';
import NotificationBell from './NotificationBell';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDexieThemes } from '@/hooks/useDexieThemes';
import type { Theme } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import SyncStatusIndicator from './SyncStatusIndicator';

interface HeaderProps {
  toggleSidebar?: () => void;
}

export default function Header({ toggleSidebar }: HeaderProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const { themes, isLoading: isLoadingThemes, refetch: refetchThemes } = useDexieThemes();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSwitchingTheme, setIsSwitchingTheme] = useState(false);

  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
    }
  }, [pathname]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('loggedInUserEmail');
      localStorage.removeItem('sessionExpiresAt');
    }
    setIsLoggedIn(false);
    window.location.assign(`/login`);
  };

  const handleThemeSwitch = async (themeId: string) => {
    setIsSwitchingTheme(true);
    try {
      const response = await fetch(`/api/themes/${themeId}/set-default`, {
        method: 'PUT',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || t('ThemeManagerPage.errorSettingDefaultTheme'));
      }
      toast({
        title: t('ThemeManagerPage.themeSetDefaultSuccessTitle'),
        description: t('ThemeManagerPage.themeSetDefaultSuccessDescription', { themeName: result.data.name }),
      });
      window.location.reload(); 
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('Common.error'),
        description: error instanceof Error ? error.message : t('ThemeManagerPage.errorSettingDefaultTheme'),
      });
    } finally {
      setIsSwitchingTheme(false);
    }
  };

  const activeTheme = themes.find(theme => theme.isDefault);

  if (isLoadingTranslations) {
    return (
       <header className="bg-card shadow-sm sticky top-0 z-40 p-4 border-b">
         <div className="flex items-center gap-2">
            {isLoggedIn && toggleSidebar && <Menu className="h-6 w-6 text-muted-foreground" />}
            <Store className="h-6 w-6 text-muted-foreground" />
            <span className="text-lg sm:text-xl font-headline font-semibold text-muted-foreground">...</span>
         </div>
         <div className="flex items-center gap-1 sm:gap-2 ml-auto">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
         </div>
       </header>
    );
  }

  return (
    <header className="bg-card shadow-sm sticky top-0 z-40 p-4 border-b">
      <TooltipProvider delayDuration={100}>
        <div className="flex flex-wrap items-center justify-between gap-y-2">
            <div className="flex items-center gap-2">
                {isLoggedIn && toggleSidebar && (
                    <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-2" aria-label={t('Common.toggleNavigation')}>
                        <Menu className="h-6 w-6" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{t('Common.toggleNavigation')}</p>
                    </TooltipContent>
                    </Tooltip>
                )}
                <Link href={`/`} className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
                    <Store className="h-6 w-6" />
                    <h1 className="text-lg sm:text-xl font-headline font-semibold">{t('Header.title')}</h1>
                </Link>
            </div>

            <div className="flex w-full items-center justify-end gap-1 sm:w-auto sm:gap-2">
                {isLoggedIn ? (
                <>
                    <SyncStatusIndicator />
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label={t('Header.switchThemeButton')} disabled={isLoadingThemes || isSwitchingTheme}>
                                {isSwitchingTheme ? <Loader2 className="h-5 w-5 animate-spin" /> : <Palette className="h-5 w-5" />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t('Header.selectThemeLabel')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {isLoadingThemes && <DropdownMenuItem disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('Header.loadingThemes')}</DropdownMenuItem>}
                                {!isLoadingThemes && themes.map((theme: Theme) => (
                                <DropdownMenuItem
                                    key={theme.id}
                                    onClick={() => handleThemeSwitch(theme.id)}
                                    disabled={theme.isDefault || isSwitchingTheme}
                                    className="flex justify-between items-center"
                                >
                                    <span>{theme.name}</span>
                                    {activeTheme?.id === theme.id && <Check className="h-4 w-4 text-primary" />}
                                </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t('Header.switchThemeButton')}</p>
                        </TooltipContent>
                    </Tooltip>

                    <NotificationBell />
                    <CurrencySwitcher />
                    <LanguageSwitcher />

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label={t('Header.logoutButton')}>
                                <LogOut className="h-5 w-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{t('Header.logoutButton')}</p>
                        </TooltipContent>
                    </Tooltip>
                </>
                ) : (
                <LanguageSwitcher />
                )}
            </div>
        </div>
      </TooltipProvider>
    </header>
  );
}
