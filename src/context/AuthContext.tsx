import React, { createContext, useContext, useState, useCallback } from 'react';

export type UserRole = 'super_admin' | 'branch_manager' | 'regional_admin' | 'support_exec' | 'vendor' | 'rider' | 'customer';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  permissions: string[];
  vendorId?: string;
  avatar?: string;
  phone?: string;
  branchId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  hasPermission: (...perms: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode; storagePrefix?: 'admin' | 'vendor' | 'rider' | 'regional_admin' }> = ({ children, storagePrefix = 'admin' }) => {
  const tokenKey = `shopindia_${storagePrefix}_token`;
  const userKey  = `shopindia_${storagePrefix}_user`;

  const [token, setToken] = useState<string | null>(() => localStorage.getItem(tokenKey));
  const [user,  setUser]  = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(userKey);
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem(tokenKey, newToken);
    localStorage.setItem(userKey, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, [tokenKey, userKey]);

  const logout = useCallback(() => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    setToken(null);
    setUser(null);
  }, [tokenKey, userKey]);

  // super_admin always passes role checks
  const hasRole = useCallback((...roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  const hasPermission = useCallback((...perms: string[]) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return perms.some((p) => user.permissions?.includes(p) ?? false);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token && !!user, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
