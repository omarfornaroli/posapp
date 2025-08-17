
// src/components/layout/AppLayout.tsx
'use client';

import type React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import SessionExpirationDialog from './SessionExpirationDialog';
import { syncService } from '@/services/sync.service';
import type { User, Permission } from '@/types';
import { translationRxService } from '@/services/translation.rx.service';
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from '@/context/AuthContext';


interface UserWithPermissions extends User {
  permissions: Permission[];
}

interface AppLayoutProps {
  children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = 'sidebarOpen';
const SESSION_WARNING_MS = 60 * 1000; // 60 seconds before expiration

function MainAppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const [authStatusDetermined, setAuthStatusDetermined] = useState(false);
  const [userIsLoggedIn, setUserIsLoggedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [isSessionWarningVisible, setIsSessionWarningVisible] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);

  const publicPaths = ['/login', '/setup-account', '/reset-password'];
  const isPublicPage = publicPaths.some(path => pathname.startsWith(path));

  useEffect(() => {
    const initialLocale = typeof window !== 'undefined' ? (localStorage.getItem('preferredLocale') || navigator.language) : 'en';
    translationRxService.initialize(initialLocale);
  }, []);

  const handleLogout = useCallback(() => {
    setIsSessionWarningVisible(false);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loggedInUserEmail');
    localStorage.removeItem('sessionExpiresAt');
    setUserIsLoggedIn(false);
    // Full page reload to login, clearing all state
    window.location.assign(`/login`);
  }, []);

  const handleExtendSession = useCallback(() => {
    const wasRemembered = (sessionExpiresAt && sessionExpiresAt - Date.now() > 5 * 60 * 1000);
    const newExpiresIn = wasRemembered ? 15 * 24 * 60 * 60 * 1000 : 5 * 60 * 1000;
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

      if (!loggedInStatus && !isPublicPage) {
        window.location.assign(`/login`);
      }
      setAuthStatusDetermined(true);

      const storedSidebarState = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (storedSidebarState !== null) setIsSidebarOpen(JSON.parse(storedSidebarState));
    }
  }, [pathname, isPublicPage]);

  useEffect(() => {
    if (userIsLoggedIn) {
      syncService.start();
      return () => syncService.stop();
    }
  }, [userIsLoggedIn]);

  useEffect(() => {
    if (!userIsLoggedIn || !sessionExpiresAt) {
      setIsSessionWarningVisible(false);
      return;
    }
    const interval = setInterval(() => {
      const timeLeft = sessionExpiresAt - Date.now();
      if (timeLeft <= 0) handleLogout();
      else if (timeLeft <= SESSION_WARNING_MS) setIsSessionWarningVisible(true);
      else setIsSessionWarningVisible(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [userIsLoggedIn, sessionExpiresAt, handleLogout]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => {
      const newState = !prev;
      if (typeof window !== 'undefined') localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);
  
  const showHeaderAndSidebarLogic = userIsLoggedIn && !isPublicPage;

  if (!authStatusDetermined || (userIsLoggedIn && !user?.permissions)) {
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
    <div className="flex min-h-screen bg-background">
      
      {showHeaderAndSidebarLogic && isSidebarOpen && <Sidebar toggleSidebar={toggleSidebar} />}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {showHeaderAndSidebarLogic && <Header toggleSidebar={toggleSidebar} />}
        <main className={mainContainerClass}>
          {children}
        </main>
        {isSessionWarningVisible && (
          <SessionExpirationDialog 
            open={isSessionWarningVisible}
            onExtend={handleExtendSession}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  );
}


export function AppLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserWithPermissions | null>(null);

    const fetchUserSession = useCallback(async (email: string) => {
        try {
            const response = await fetch(`/api/auth/session`, {
                headers: { 'X-User-Email': email }
            });
            if (!response.ok) throw new Error('Failed to fetch user session');
            const result = await response.json();
            if (result.success && result.data) {
                setUser(result.data as UserWithPermissions);
            } else {
                throw new Error(result.error || 'User session data not found');
            }
        } catch (error) {
            console.error('Error fetching user session:', error);
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('loggedInUserEmail');
            setUser(null);
            if (!window.location.pathname.startsWith('/login')) {
                window.location.assign(`/login`);
            }
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const userEmail = localStorage.getItem('loggedInUserEmail');
            if (userEmail) {
                fetchUserSession(userEmail);
            }
        }
        
        const handleProfileUpdate = (event: Event) => {
          const customEvent = event as CustomEvent<UserWithPermissions>;
          if (customEvent.detail) setUser(customEvent.detail);
        };
        window.addEventListener('userProfileUpdated', handleProfileUpdate);
        return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);

    }, [fetchUserSession]);

    return (
        <AuthProvider value={{ user }}>
            <MainAppLayout>
                {children}
            </MainAppLayout>
        </AuthProvider>
    );
}
