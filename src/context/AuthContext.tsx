

'use client';

import type React from 'react';
import { createContext, useContext, useMemo } from 'react';
import type { User, Permission } from '@/types';

interface UserWithPermissions extends User {
  permissions: Permission[];
}

interface AuthContextType {
  user: UserWithPermissions | null;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => boolean;
  fetchUserSession: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: { user: UserWithPermissions | null, fetchUserSession: (email: string) => Promise<void> };
}) {
  const { user, fetchUserSession } = value;
  const isAuthenticated = !!user;

  const hasPermission = useMemo(() => (permissionToCheck: Permission): boolean => {
    if (!user || !user.permissions) {
      return false;
    }
    return user.permissions.includes(permissionToCheck);
  }, [user]);
  
  const contextValue = useMemo(() => ({ user, isAuthenticated, hasPermission, fetchUserSession }), [user, isAuthenticated, hasPermission, fetchUserSession]);
  
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
