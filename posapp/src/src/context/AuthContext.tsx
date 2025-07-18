
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User, Permission } from '@/types';

interface UserWithPermissions extends User {
  permissions: Permission[];
}

interface AuthContextType {
  user: UserWithPermissions | null;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// The provider component no longer accepts a 'value' prop.
// It manages its own state internally.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserWithPermissions | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserSession = useCallback(async (email: string) => {
    try {
      const response = await fetch(`/api/auth/session`, {
        headers: { 'X-User-Email': email }
      });
      if (!response.ok) throw new Error('Failed to fetch session');
      const result = await response.json();
      if (result.success && result.data) {
        setUser(result.data);
        setIsAuthenticated(true);
      } else {
        throw new Error(result.error || 'User session data not found');
      }
    } catch (error) {
      console.error('Error fetching user session:', error);
      // Clear local state if fetching fails
      setUser(null);
      setIsAuthenticated(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('loggedInUserEmail');
        localStorage.removeItem('sessionExpiresAt');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check login status on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loggedInStatus = localStorage.getItem('isLoggedIn') === 'true';
      const userEmail = localStorage.getItem('loggedInUserEmail');
      const expiresAt = localStorage.getItem('sessionExpiresAt');

      if (loggedInStatus && userEmail && expiresAt && parseInt(expiresAt, 10) > Date.now()) {
        fetchUserSession(userEmail);
      } else {
        setIsLoading(false); // Not logged in
        setIsAuthenticated(false);
        setUser(null);
      }
    }
  }, [fetchUserSession]);
  
   // Listen for profile updates from other components
  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<UserWithPermissions>;
      if (customEvent.detail) setUser(customEvent.detail);
    };
    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
  }, []);

  const hasPermission = useMemo(() => (permissionToCheck: Permission): boolean => {
    if (!user || !user.permissions) {
      return false;
    }
    return user.permissions.includes(permissionToCheck);
  }, [user]);

  const contextValue = useMemo(() => ({
    user,
    isAuthenticated: !isLoading && isAuthenticated, // Only authenticated if not loading and is logged in
    hasPermission,
  }), [user, isLoading, isAuthenticated, hasPermission]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
