

'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { LayoutGrid, Package, FileText, Users, Percent, Languages, UserCog, TicketPercent, Palette, CreditCardIcon, Cog, Loader2, X, Bell, ShieldAlert, Lock, MapIcon, Landmark, Building2, Truck, BrainCircuit, LayoutDashboard, ListCollapse, ShoppingCart } from 'lucide-react'; 
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useRxTranslate } from '@/hooks/use-rx-translate';
import { usePathname, useSearchParams } from 'next/navigation'; 
import { Separator } from '@/components/ui/separator';
import type { User, Permission } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area'; 
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from '@/context/AuthContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { useDexiePOSSettings } from '@/hooks/useDexiePOSSettings';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  toggleSidebar: () => void; 
}

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const names = name.split(' ');
  if (names.length > 1 && names[0] && names[names.length - 1]) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  if (names[0]) {
    return names[0].substring(0, 2).toUpperCase();
  }
  return 'U';
};

interface MenuItemConfig {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  permission?: Permission;
  category?: 'main' | 'sales' | 'catalog' | 'configuration' | 'administration' | 'system';
}

export default function Sidebar({ toggleSidebar }: SidebarProps) {
  const { t, isLoading: isLoadingTranslations, initializeTranslations, currentLocale } = useRxTranslate();
  const { user: loggedInUser, hasPermission } = useAuth(); 
  const { posSettings } = useDexiePOSSettings();
  const syncStatus = useSyncStatus();
  
  useEffect(() => {
    initializeTranslations(currentLocale);
  }, [initializeTranslations, currentLocale]);
  
  const nextPathname = usePathname(); 
  const searchParams = useSearchParams();

  const handleLinkClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) { // Tailwind's lg breakpoint
      if(toggleSidebar) {
        toggleSidebar();
      }
    }
  };

  const menuItemsConfig: MenuItemConfig[] = useMemo(() => {
    const baseConfig: MenuItemConfig[] = [
      { href: '/', labelKey: 'Header.dashboardLink', icon: LayoutDashboard, permission: 'access_dashboard_page', category: 'main' },
      // POS items will be inserted here
      { href: '/sales-report', labelKey: 'Header.salesReportsLink', icon: FileText, permission: 'manage_sales_reports_page', category: 'sales' },
      { href: '/reports', labelKey: 'Header.reportsLink', icon: BrainCircuit, permission: 'manage_reports_page', category: 'sales' },
      { href: '/dispatches', labelKey: 'Header.dispatchesLink', icon: Truck, permission: 'manage_dispatches_page', category: 'sales' },
      { href: '/products', labelKey: 'Header.productsLink', icon: Package, permission: 'manage_products_page', category: 'catalog' },
      { href: '/clients', labelKey: 'Header.clientsLink', icon: Users, permission: 'manage_clients_page', category: 'catalog' },
      { href: '/suppliers', labelKey: 'Header.suppliersLink', icon: Building2, permission: 'manage_suppliers_page', category: 'catalog' },
      { href: '/promotions', labelKey: 'Header.promotionsLink', icon: TicketPercent, permission: 'manage_promotions_page', category: 'catalog' },
      { href: '/taxes', labelKey: 'Header.taxManagerLink', icon: Percent, permission: 'manage_taxes_page', category: 'configuration' },
      { href: '/countries', labelKey: 'Header.countriesLink', icon: MapIcon, permission: 'manage_countries_page', category: 'configuration'},
      { href: '/currencies', labelKey: 'Header.currenciesLink', icon: Landmark, permission: 'manage_currencies_page', category: 'configuration'}, 
      { href: '/payment-methods', labelKey: 'Header.paymentMethodsLink', icon: CreditCardIcon, permission: 'manage_payment_methods_page', category: 'configuration' },
      { href: '/users', labelKey: 'Header.usersManagerLink', icon: UserCog, permission: 'manage_users_page', category: 'administration' },
      { href: '/roles', labelKey: 'Header.rolesPermissionsLink', icon: Lock, permission: 'view_roles_permissions_page', category: 'administration'},
      { href: '/notifications', labelKey: 'NotificationsManagerPage.sidebarLink', icon: Bell, permission: 'manage_notifications_page', category: 'administration' },
      { href: '/themes', labelKey: 'Header.themesManagerLink', icon: Palette, permission: 'manage_themes_page', category: 'system' },
      { href: '/translations', labelKey: 'Header.translationsManagerLink', icon: Languages, permission: 'manage_translations_page', category: 'system' },
      { href: '/languages', labelKey: 'Header.languagesManagerLink', icon: Languages, permission: 'manage_languages_page', category: 'system' }, 
      { href: '/settings', labelKey: 'Header.settingsLink', icon: Cog, permission: 'manage_settings_page', category: 'system' }, 
    ];

    const posItems: MenuItemConfig[] = [];

    if (posSettings?.separateCartAndPayment) {
        posItems.push({ href: '/pos', labelKey: 'Header.cartLink', icon: ShoppingCart, permission: 'access_pos_page', category: 'main' });
        posItems.push({ href: '/pos?view=checkout', labelKey: 'Header.checkoutLink', icon: CreditCardIcon, permission: 'access_pos_page', category: 'main' });
    } else {
        posItems.push({ href: '/pos', labelKey: 'Header.posLink', icon: LayoutGrid, permission: 'access_pos_page', category: 'main' });
    }

    baseConfig.splice(1, 0, ...posItems); // Insert after Dashboard

    return baseConfig;
  }, [posSettings]);

  const groupedMenuItems = useMemo(() => menuItemsConfig
      .filter(item => !item.permission || hasPermission(item.permission))
      .reduce((acc, item) => {
        const category = item.category || 'uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          ...item,
          translatedLabel: t(item.labelKey),
        });
        // Sort items within each category
        acc[category].sort((a, b) => a.translatedLabel.localeCompare(b.translatedLabel, currentLocale, { sensitivity: 'base' }));
        return acc;
      }, {} as Record<string, (MenuItemConfig & { translatedLabel: string })[]>),
      [menuItemsConfig, hasPermission, t, currentLocale]
  );


  const categoryStyles: Record<string, string> = {
    main: 'bg-primary/10 text-primary hover:bg-primary/20',
    sales: 'bg-accent/10 text-accent hover:bg-accent/20',
    catalog: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20',
    configuration: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
    administration: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
    system: 'bg-muted text-muted-foreground hover:bg-muted/90',
  };

  const categoryOrder: (keyof typeof groupedMenuItems)[] = ['main', 'sales', 'catalog', 'configuration', 'administration', 'system', 'uncategorized'];

  const isActive = (href: string) => {
    // Special handling for POS links to differentiate between cart and checkout views
    if (href.startsWith('/pos')) {
      const isCheckoutView = searchParams.get('view') === 'checkout';
      if (href === '/pos?view=checkout') {
        return nextPathname === '/pos' && isCheckoutView;
      }
      if (href === '/pos') {
        return nextPathname === '/pos' && !isCheckoutView;
      }
    }

    // Default logic for all other links
    // Exact match for the root page to avoid matching all paths
    if (href === '/') {
      return nextPathname === '/';
    }
    // For other pages, use startsWith to handle nested routes like /receipt/[id]
    return nextPathname.startsWith(href);
  };

  const renderMenuItem = (item: MenuItemConfig & { translatedLabel: string }) => {
    const isOffline = syncStatus === 'offline';
    const isDisabled = isOffline && item.href === '/reports';

    const linkContent = (
      <Link
        href={isDisabled ? '#' : item.href}
        onClick={isDisabled ? (e) => e.preventDefault() : handleLinkClick}
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg transition-colors w-full',
          {
            'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90': isActive(item.href) && !isDisabled,
            'hover:bg-muted hover:text-foreground': !isActive(item.href) && !isDisabled,
            'opacity-50 cursor-not-allowed': isDisabled,
          }
        )}
        aria-disabled={isDisabled}
        tabIndex={isDisabled ? -1 : undefined}
      >
        <item.icon className={cn('h-5 w-5 shrink-0', isActive(item.href) && !isDisabled ? 'text-primary-foreground' : 'text-primary/80')} />
        <span className="font-medium">{item.translatedLabel}</span>
      </Link>
    );

    return (
      <li key={item.href}>
        {isDisabled ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">{linkContent}</div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{t('Sidebar.reportsOfflineMessage')}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          linkContent
        )}
      </li>
    );
  };
  
  const renderLoadingSkeleton = () => (
    <nav className="pr-2">
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </nav>
  );

  return (
    <TooltipProvider>
      <aside className={cn("w-72 bg-card text-card-foreground p-4 flex flex-col space-y-2 border-r h-screen sticky top-0 shadow-md z-50", "no-print")}>
        <div className="flex items-center justify-between shrink-0 pt-3 pb-1">
          <div className="flex-grow flex flex-col items-center space-y-3">
            <Avatar className="h-20 w-20 ring-2 ring-primary/50">
              <AvatarImage 
                src={loggedInUser?.imageUrl || 'https://placehold.co/128x128.png'} 
                alt={loggedInUser?.name || 'User Avatar'} 
                data-ai-hint={loggedInUser?.imageUrl ? "user profile" : "human male"}
              />
              <AvatarFallback className="text-xl bg-muted">
                {getInitials(loggedInUser?.name)}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold text-lg font-headline text-primary">
              {loggedInUser?.name || 'User'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="lg:hidden absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            aria-label={t('Common.toggleNavigation')}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
        <Separator className="shrink-0" />
        
        <ScrollArea className="flex-grow min-h-0"> 
          {isLoadingTranslations ? renderLoadingSkeleton() : (
            <nav className="pr-2">
              {groupedMenuItems['uncategorized'] && (
                <ul className="space-y-1">
                  {groupedMenuItems['uncategorized'].map(renderMenuItem)}
                </ul>
              )}
              <Accordion type="multiple" defaultValue={['main', 'sales', 'catalog']} className="w-full space-y-1">
                {categoryOrder.map(categoryKey => {
                  if (categoryKey === 'uncategorized' || !groupedMenuItems[categoryKey]) return null;
                  const categoryStyle = categoryStyles[categoryKey] || 'hover:bg-muted';
                  return (
                    <AccordionItem value={categoryKey} key={categoryKey} className="border-b-0">
                      <AccordionTrigger className={cn(
                        "py-3 px-3 rounded-lg hover:no-underline text-sm font-semibold",
                        categoryStyle
                      )}>
                        {t(`Sidebar.category${categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)}`)}
                      </AccordionTrigger>
                      <AccordionContent className="pb-0 pl-2">
                        <ul className="space-y-1 border-l-2 border-primary/20 py-2">
                          {groupedMenuItems[categoryKey].map(renderMenuItem)}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </nav>
          )}
        </ScrollArea>
        
        <Separator className="shrink-0" />
        <div className="py-2 text-center text-xs text-muted-foreground shrink-0">
          POSAPP v1.0
        </div>
      </aside>
    </TooltipProvider>
  );
}
