import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './authContextValue';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, name: string, email: string) => void;
  logout: () => void;
  updateUser: (name: string, email: string) => void;
}

const AUTH_STORAGE_KEYS = {
  token: 'token',
  name: 'userName',
  email: 'userEmail',
} as const;

interface JwtPayload {
  userId: string;
  exp?: number;
}

interface StoredAuth {
  token: string;
  user: AuthUser;
}

function removeStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEYS.token);
  localStorage.removeItem(AUTH_STORAGE_KEYS.name);
  localStorage.removeItem(AUTH_STORAGE_KEYS.email);
}

function parseJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=');
    const payload = JSON.parse(atob(paddedBase64));
    const userId = payload.sub || payload.userId;

    if (typeof userId !== 'string') return null;
    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) return null;

    return {
      userId,
      exp: typeof payload.exp === 'number' ? payload.exp : undefined,
    };
  } catch {
    return null;
  }
}

function getStoredAuth(): StoredAuth | null {
  const storedToken = localStorage.getItem(AUTH_STORAGE_KEYS.token);
  const storedName = localStorage.getItem(AUTH_STORAGE_KEYS.name);
  const storedEmail = localStorage.getItem(AUTH_STORAGE_KEYS.email);

  if (!storedToken || !storedName || !storedEmail) return null;

  const payload = parseJwt(storedToken);
  if (!payload) {
    removeStoredAuth();
    return null;
  }

  return {
    token: storedToken,
    user: { id: payload.userId, name: storedName, email: storedEmail },
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [storedAuth] = useState<StoredAuth | null>(() => getStoredAuth());
  const [user, setUser] = useState<AuthUser | null>(() => storedAuth?.user ?? null);
  const [token, setToken] = useState<string | null>(() => storedAuth?.token ?? null);

  const login = useCallback((newToken: string, name: string, email: string) => {
    const payload = parseJwt(newToken);
    if (!payload) return;

    localStorage.setItem(AUTH_STORAGE_KEYS.token, newToken);
    localStorage.setItem(AUTH_STORAGE_KEYS.name, name);
    localStorage.setItem(AUTH_STORAGE_KEYS.email, email);

    setToken(newToken);
    setUser({ id: payload.userId, name, email });
  }, []);

  const logout = useCallback(() => {
    removeStoredAuth();
    setToken(null);
    setUser(null);
    navigate('/login');
  }, [navigate]);

  const updateUser = useCallback((name: string, email: string) => {
    localStorage.setItem(AUTH_STORAGE_KEYS.name, name);
    localStorage.setItem(AUTH_STORAGE_KEYS.email, email);
    setUser((prev) => prev ? { ...prev, name, email } : null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
