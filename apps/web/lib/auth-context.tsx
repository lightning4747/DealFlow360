'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'sales_rep' | 'sales_manager' | 'finance' | 'customer';
}

interface AuthContextType {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signup: (dto: { email: string; password: string; name: string; role?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  accessToken: null,
  isLoading: true,
  login: async () => ({ success: false }),
  signup: async () => ({ success: false }),
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
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        return { success: false, error: json?.message || 'Invalid email or password' };
      }

      const authData = json?.data;
      if (authData?.user && authData?.tokens?.accessToken) {
        setUser(authData.user);
        setAccessToken(authData.tokens.accessToken);
        localStorage.setItem('df360_access_token', authData.tokens.accessToken);
        localStorage.setItem('df360_user', JSON.stringify(authData.user));
        return { success: true };
      }
      return { success: false, error: 'Malformed response from authentication server' };
    } catch (err: any) {
      console.error('Login error:', err);
      return { success: false, error: err.message || 'Network error reaching auth server' };
    }
  };

  const signup = async (dto: { email: string; password: string; name: string; role?: string }) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${apiUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: dto.email.trim(),
          password: dto.password,
          name: dto.name.trim(),
          role: dto.role || 'sales_rep',
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        return { success: false, error: json?.message || 'Registration failed' };
      }

      const authData = json?.data;
      if (authData?.user && authData?.tokens?.accessToken) {
        setUser(authData.user);
        setAccessToken(authData.tokens.accessToken);
        localStorage.setItem('df360_access_token', authData.tokens.accessToken);
        localStorage.setItem('df360_user', JSON.stringify(authData.user));
        return { success: true };
      }
      return { success: false, error: 'Registration succeeded but session could not be established' };
    } catch (err: any) {
      console.error('Signup error:', err);
      return { success: false, error: err.message || 'Network error reaching server' };
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
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
