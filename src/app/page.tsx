'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardPage from './dashboard/page';
import LoginPage from './login/page';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const { user, isAuthenticated } = useAuth();
  const [authStatusDetermined, setAuthStatusDetermined] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
      if (loggedIn) {
        if (isAuthenticated) {
          setAuthStatusDetermined(true);
        }
      } else {
        setAuthStatusDetermined(true);
        router.replace('/login');
      }
    };
    
    checkAuth();
  }, [isAuthenticated, router]);

  if (!authStatusDetermined) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,64px)-4rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return isAuthenticated ? <DashboardPage /> : null;
}
