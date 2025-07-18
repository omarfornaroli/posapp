
'use client';

import type React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from '@/context/AuthContext';
import { syncService } from '@/services/sync.service';
import SessionExpirationDialog from '@/components/layout/SessionExpirationDialog';
import { Header } from '@radix-ui/react-accordion';
import { Loader2, Sidebar } from 'lucide-react';

const SIDEBAR_STORAGE_KEY = 'sidebarOpen';
const SESSION_WARNING_MS = 60 * 1000; // 60 seconds before expiration

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user: loggedInUser, isAuthenticated } = useAuth();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [isSessionWarningVisible, setIsSessionWarningVisible] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const publicPaths = ['/login', '/setup-account', '/reset-password'];
  const isPublicPage = publicPaths.some(path => pathname.includes(path));

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedSidebarState = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (storedSidebarState !== null) setIsSidebarOpen(JSON.parse(storedSidebarState));

      const storedExpiresAt = localStorage.getItem('sessionExpiresAt');
      setSessionExpiresAt(storedExpiresAt ? parseInt(storedExpiresAt, 10) : null);
    }
  }, []);
  
  const handleLogout = useCallback(() => {
    setIsSessionWarningVisible(false);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loggedInUserEmail');
    localStorage.removeItem('sessionExpiresAt');
    window.location.assign(`/login`);
  }, []);

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
    if (isAuthenticated) {
      syncService.start();
      return () => {
        syncService.stop();
      };
    }
  }, [isAuthenticated]);
  
  useEffect(() => {
    if (!isAuthenticated || !sessionExpiresAt) {
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
  }, [isAuthenticated, sessionExpiresAt, handleLogout]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => {
      const newState = !prev;
      if (typeof window !== 'undefined') localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);
  
  if (!isClient) {
    // Render a skeleton layout on the server
     return (
      <div className="flex min-h-screen bg-background">
        <aside className="w-64 bg-card p-4 flex-col space-y-4 border-r h-screen sticky top-0 hidden lg:flex">
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
        </div>
      </div>
    );
  }
  
  if (isAuthenticated && !loggedInUser && !isPublicPage) {
     return (
      <div className="flex justify-center items-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const showHeaderAndSidebarLogic = isAuthenticated && !isPublicPage;

  return (
    <div className="flex min-h-screen bg-background">
      {showHeaderAndSidebarLogic && isSidebarOpen && <Sidebar toggleSidebar={toggleSidebar} />}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {showHeaderAndSidebarLogic && <Header toggleSidebar={toggleSidebar} />}
        <main className={isPublicPage ? "flex-grow" : "flex-grow container mx-auto px-4 py-8"}>
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
