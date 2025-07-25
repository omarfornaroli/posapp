
'use client';

import type React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import Header from './Header';
import Sidebar from './Sidebar';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from "@/components/ui/skeleton";
import type { User, Permission } from '@/types'; 
import { AuthProvider } from '@/context/AuthContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { translationRxService } from '@/services/translation.rx.service';
import SessionExpirationDialog from './SessionExpirationDialog';
import { syncService } from '@/services/sync.service';

interface UserWithPermissions extends User {
  permissions: Permission[];
}

interface AppLayoutProps {
  children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = 'sidebarOpen';
const SESSION_WARNING_MS = 60 * 1000; // 60 seconds before expiration

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const initialNextIntlLocale = useLocale();

  const [authStatusDetermined, setAuthStatusDetermined] = useState(false);
  const [userIsLoggedIn, setUserIsLoggedIn] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<UserWithPermissions | null>(null); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [isSessionWarningVisible, setIsSessionWarningVisible] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);

  const publicPaths = ['/login', '/setup-account', '/reset-password'];
  const isPublicPage = publicPaths.some(path => pathname.startsWith(path));

  useEffect(() => {
    translationRxService.initialize(initialNextIntlLocale);
  }, [initialNextIntlLocale]);
  
  const handleLogout = useCallback(() => {
      setIsSessionWarningVisible(false);
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('loggedInUserEmail');
      localStorage.removeItem('sessionExpiresAt');
      setUserIsLoggedIn(false);
      setLoggedInUser(null);
      setSessionExpiresAt(null);
      window.location.assign(`/login`);
  }, []);

  const fetchUserSession = useCallback(async (email: string) => {
    try {
      const response = await fetch(`/api/auth/session`, {
        headers: {
          'X-User-Email': email
        }
      });
      
      if (!response.ok) {
        let apiError = 'Failed to fetch user session or user not found';
        try {
          const errorResult = await response.json();
          apiError = errorResult?.error || apiError;
        } catch (e) { /* Ignore parse error, use default */ }
        throw new Error(apiError);
      }
      const result = await response.json();
      if (result.success && result.data) {
        setLoggedInUser(result.data as UserWithPermissions);
      } else {
        throw new Error(result.error || 'User session data not found in response');
      }
    } catch (error) {
      console.error('Error fetching user session:', error);
      handleLogout();
    }
  }, [handleLogout]);

  const handleExtendSession = useCallback(() => {
    const wasRemembered = (sessionExpiresAt && sessionExpiresAt - Date.now() > 5 * 60 * 1000);
    const newExpiresIn = wasRemembered 
      ? 15 * 24 * 60 * 60 * 1000 // 15 days
      : 5 * 60 * 1000; // 5 minutes
    const newExpiresAt = Date.now() + newExpiresIn;
    
    localStorage.setItem('sessionExpiresAt', String(newExpiresAt));
    setSessionExpiresAt(newExpiresAt);
    setIsSessionWarningVisible(false);
  }, [sessionExpiresAt]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loggedInStatus = localStorage.getItem('isLoggedIn') === 'true';
      setUserIsLoggedIn(loggedInStatus);
      
      const storedExpiresAt = localStorage.getItem('sessionExpiresAt');
      setSessionExpiresAt(storedExpiresAt ? parseInt(storedExpiresAt, 10) : null);

      if (loggedInStatus) {
        const userEmail = localStorage.getItem('loggedInUserEmail');
        if (userEmail) {
          fetchUserSession(userEmail);
        } else {
          handleLogout();
        }
      } else {
        setLoggedInUser(null);
        if (!isPublicPage) {
            window.location.assign(`/login`);
        }
      }
      setAuthStatusDetermined(true);

      const storedSidebarState = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (storedSidebarState !== null) setIsSidebarOpen(JSON.parse(storedSidebarState));
    }
  }, [pathname, isPublicPage, fetchUserSession, handleLogout]);

  useEffect(() => {
    if (userIsLoggedIn) {
      syncService.start();
      return () => {
        syncService.stop();
      };
    }
  }, [userIsLoggedIn]);
  
  useEffect(() => {
      if (!userIsLoggedIn || !sessionExpiresAt) {
          setIsSessionWarningVisible(false);
          return;
      };

      const interval = setInterval(() => {
          const now = Date.now();
          const timeLeft = sessionExpiresAt - now;

          if (timeLeft <= 0) {
              handleLogout();
          } else if (timeLeft <= SESSION_WARNING_MS) {
              setIsSessionWarningVisible(true);
          } else {
              setIsSessionWarningVisible(false);
          }
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
  }, [userIsLoggedIn, sessionExpiresAt, handleLogout]);
  
  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<UserWithPermissions>;
      if (customEvent.detail) setLoggedInUser(customEvent.detail);
    };
    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
  }, []); 

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => {
      const newState = !prev;
      if (typeof window !== 'undefined') localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);
  
  const showHeaderAndSidebarLogic = userIsLoggedIn && !isPublicPage;

  if ((!authStatusDetermined && !isPublicPage) || (userIsLoggedIn && !loggedInUser && !isPublicPage)) {
    return (
      <div className="flex min-h-screen bg-background">
        <aside className="w-64 bg-card p-4 flex flex-col space-y-4 border-r h-screen sticky top-0">
          <div className="flex flex-col items-center space-y-3 pt-3 pb-1"><Skeleton className="h-20 w-20 rounded-full" /><Skeleton className="h-5 w-28 rounded" /></div>
          <Skeleton className="h-px w-full" />
          <nav className="flex-grow mt-4 space-y-2">{[...Array(6)].map((_, i) => (<Skeleton key={i} className="h-10 w-full rounded-md" />))}</nav>
        </aside>
        <div className="flex-1 flex flex-col">
          <header className="bg-card shadow-sm sticky top-0 z-40 h-[var(--header-height)] flex items-center px-4 border-b">
            <div className="flex items-center gap-2"><Skeleton className="h-7 w-7 rounded" /><Skeleton className="h-6 w-36 rounded" /></div>
            <div className="flex items-center gap-2 ml-auto"><Skeleton className="h-8 w-20 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div>
          </header>
          <main className="flex-grow container mx-auto px-4 py-8">
            <Skeleton className="h-9 w-1/3 mb-6 rounded" /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"><Skeleton className="md:col-span-1 lg:col-span-2 h-80 rounded-lg" /><Skeleton className="h-80 rounded-lg" /></div>
          </main>
        </div><Toaster />
      </div>
    );
  }
  
  const mainContainerClass = isPublicPage ? "flex-grow" : "flex-grow container mx-auto px-4 py-8";

  return (
    <AuthProvider value={{ user: loggedInUser }}>
      <CurrencyProvider>
        <div className="flex min-h-screen bg-background">
          {showHeaderAndSidebarLogic && isSidebarOpen && <Sidebar toggleSidebar={toggleSidebar} />}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {showHeaderAndSidebarLogic && <Header toggleSidebar={toggleSidebar} />}
            <main className={mainContainerClass}>
              {children}
            </main>
            <Toaster />
            {isSessionWarningVisible && (
              <SessionExpirationDialog 
                open={isSessionWarningVisible}
                onExtend={handleExtendSession}
                onLogout={handleLogout}
              />
            )}
          </div>
        </div>
      </CurrencyProvider>
    </AuthProvider>
  );
}
