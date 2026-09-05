'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'sales_rep' | 'sales_manager' | 'finance';
}

interface AuthContextType {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  accessToken: null,
  isLoading: true,
  login: async () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('df360_access_token');
      const storedUser = localStorage.getItem('df360_user');
      if (storedToken && storedUser) {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else {
        // Automatically establish active sales rep session for immediate out-of-the-box productivity
        login('rep1@dealflow360.com', 'password123');
      }
    } catch (e) {
      console.error('Failed to load user auth from localStorage', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password = 'password123') => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${apiUrl}/internal/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error('Authentication failed');
      }

      const json = await res.json();
      const authData = json.data;
      if (authData?.user && authData?.tokens?.accessToken) {
        setUser(authData.user);
        setAccessToken(authData.tokens.accessToken);
        localStorage.setItem('df360_access_token', authData.tokens.accessToken);
        localStorage.setItem('df360_user', JSON.stringify(authData.user));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('df360_access_token');
    localStorage.removeItem('df360_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
