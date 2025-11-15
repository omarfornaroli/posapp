
// src/components/layout/AppLayout.tsx
'use client';

import type React from 'react';
import { useEffect, useState, useCallback, useMemo } from 'react';
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
import { useInitialSync } from '@/context/InitialSyncContext';
import InitialSyncScreen from './InitialSyncScreen';
import { cn } from '@/lib/utils';
import { db } from '@/lib/dexie-db';
import { getApiPath } from '@/lib/utils';

interface UserWithPermissions extends User {
  permissions: Permission[];
}

interface AppLayoutProps {
  children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = 'sidebarOpen';
const SESSION_WARNING_MS = 60 * 1000; // 60 seconds before expiration

function MainAppLayout({ children, userSessionKey }: { children: React.ReactNode, userSessionKey: string }) {
  const pathname = usePathname();
  const { user, fetchUserSession } = useAuth();
  const { isInitialSyncComplete, startInitialSync } = useInitialSync();

  const [authStatusDetermined, setAuthStatusDetermined] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [isSessionWarningVisible, setIsSessionWarningVisible] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState(30);
  
  const publicPaths = ['/login', '/setup-account', '/reset-password'];
  const isPublicPage = publicPaths.some(p => pathname === `${p}` || pathname.startsWith(`${p}/`));
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const swLocation = '/sw.js';
      navigator.serviceWorker.register(swLocation).then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      }).catch(error => {
        console.error('Service Worker registration failed:', error);
      });
    }
  }, []);

  useEffect(() => {
    const initialLocale = typeof window !== 'undefined' ? (localStorage.getItem('preferredLocale') || navigator.language) : 'en';
    translationRxService.initialize(initialLocale);
  }, []);

  useEffect(() => {
    async function fetchSessionDuration() {
        const settings = await db.posSettings.get('global_pos_settings');
        if (settings && settings.sessionDuration) {
            setSessionDurationMinutes(settings.sessionDuration);
        }
    }
    fetchSessionDuration();
  }, []);

  const handleLogout = useCallback(() => {
    setIsSessionWarningVisible(false);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loggedInUserEmail');
    localStorage.removeItem('sessionExpiresAt');
    localStorage.removeItem('initialSyncCompleted');
    window.location.assign(getApiPath('/login'));
  }, []);

  const handleExtendSession = useCallback(() => {
    const wasRemembered = (sessionExpiresAt && sessionExpiresAt - Date.now() > 5 * 60 * 1000 + SESSION_WARNING_MS); // check if original duration was longer than standard
    const newExpiresIn = wasRemembered ? 15 * 24 * 60 * 60 * 1000 : sessionDurationMinutes * 60 * 1000;
    const newExpiresAt = Date.now() + newExpiresIn;
    localStorage.setItem('sessionExpiresAt', String(newExpiresAt));
    setSessionExpiresAt(newExpiresAt);
    setIsSessionWarningVisible(false);
  }, [sessionExpiresAt, sessionDurationMinutes]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loggedInStatus = localStorage.getItem('isLoggedIn') === 'true';
      const storedExpiresAt = localStorage.getItem('sessionExpiresAt');
      setSessionExpiresAt(storedExpiresAt ? parseInt(storedExpiresAt, 10) : null);

      if (!loggedInStatus && !isPublicPage) {
        window.location.assign(getApiPath('/login'));
      } else if (loggedInStatus) {
        syncService.start();
        if (localStorage.getItem('initialSyncCompleted') !== 'true') {
          startInitialSync();
        }
      }
      setAuthStatusDetermined(true);

      const storedSidebarState = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (storedSidebarState !== null) setIsSidebarOpen(JSON.parse(storedSidebarState));
    }
    return () => syncService.stop();
  }, [pathname, isPublicPage, startInitialSync]);

  useEffect(() => {
    if (user && !isPublicPage && !isSessionWarningVisible) {
      const timeLeft = sessionExpiresAt ? sessionExpiresAt - Date.now() : -1;
      if (timeLeft <= 0) {
        handleLogout();
      } else if (timeLeft <= SESSION_WARNING_MS) {
        setIsSessionWarningVisible(true);
      }
    }
    const interval = setInterval(() => {
      if (user && !isPublicPage && !isSessionWarningVisible) {
        const timeLeft = sessionExpiresAt ? sessionExpiresAt - Date.now() : -1;
        if (timeLeft <= 0) {
           handleLogout();
        } else if (timeLeft <= SESSION_WARNING_MS) {
           setIsSessionWarningVisible(true);
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [user, isPublicPage, sessionExpiresAt, isSessionWarningVisible, handleLogout]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => {
      const newState = !prev;
      if (typeof window !== 'undefined') localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);
  
  const showHeaderAndSidebarLogic = !!user && !isPublicPage;

  if (!authStatusDetermined || (!!localStorage.getItem('isLoggedIn') && !user?.permissions)) {
    return (
      <div className="flex min-h-screen bg-background">
        <aside className="w-72 bg-card p-4 flex flex-col space-y-4 border-r h-screen sticky top-0">
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

  if (showHeaderAndSidebarLogic && !isInitialSyncComplete) {
    return <InitialSyncScreen />;
  }

  const mainContainerClass = isPublicPage ? "flex-grow" : "flex-grow container mx-auto px-4 py-8";

  return (
    <div key={userSessionKey} className="flex min-h-screen bg-background">
      
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
    const [userSessionKey, setUserSessionKey] = useState('initial');

    const fetchUserSession = useCallback(async (email: string) => {
        try {
            const userFromDb = await db.users.where('email').equalsIgnoreCase(email).first();
            const rolePermissions = userFromDb ? await db.rolePermissions.get(userFromDb.role) : null;
            if (userFromDb && rolePermissions) {
                 setUser({ ...userFromDb, permissions: rolePermissions.permissions });
                 setUserSessionKey(email);
            }
        } catch(e) {
            console.error("Error loading user from Dexie", e);
        }

        if (navigator.onLine) {
            try {
                const response = await fetch(getApiPath(`/api/auth/session`), { headers: { 'X-User-Email': email } });
                if (!response.ok) throw new Error('Failed to fetch user session from API');
                const result = await response.json();
                if (result.success && result.data) {
                    const userWithPermissions = result.data as UserWithPermissions;
                    setUser(userWithPermissions);
                    const { permissions, ...userToSave } = userWithPermissions;
                    await db.users.put(userToSave); 
                    if (userSessionKey !== email) setUserSessionKey(email);
                } else {
                    throw new Error(result.error || 'User session data not found');
                }
            } catch (error) {
                console.error('Error refreshing user session (online):', error);
                const localUser = await db.users.where('email').equalsIgnoreCase(email).first();
                if (!localUser) {
                    localStorage.removeItem('isLoggedIn');
                    localStorage.removeItem('loggedInUserEmail');
                    setUser(null);
                    setUserSessionKey('logged-out'); 
                    if (!window.location.pathname.startsWith(getApiPath('/login'))) {
                        window.location.assign(getApiPath('/login'));
                    }
                }
            }
        }
    }, [userSessionKey]);

    useEffect(() => {
        const userEmail = typeof window !== 'undefined' ? localStorage.getItem('loggedInUserEmail') : null;
        if (userEmail) {
            fetchUserSession(userEmail);
        } else {
             setUserSessionKey('no-user'); 
        }
        
        const handleProfileUpdate = (event: Event) => {
          const customEvent = event as CustomEvent<UserWithPermissions>;
          if (customEvent.detail) setUser(customEvent.detail);
        };
        window.addEventListener('userProfileUpdated', handleProfileUpdate);
        return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
    }, [fetchUserSession]);

    return (
        <AuthProvider value={{ user, fetchUserSession }}>
            <MainAppLayout userSessionKey={userSessionKey}>
                {children}
            </MainAppLayout>
        </AuthProvider>
    );
}
