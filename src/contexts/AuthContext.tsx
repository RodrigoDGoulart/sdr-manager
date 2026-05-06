import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, name: string, email: string) => void;
  logout: () => void;
  updateUser: (name: string, email: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function parseJwt(token: string): { userId: string } | null {
  try {
    const base64 = token.split('.')[1];
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedName = localStorage.getItem('userName');
    const storedEmail = localStorage.getItem('userEmail');

    if (storedToken && storedName && storedEmail) {
      const payload = parseJwt(storedToken);
      if (payload) {
        setToken(storedToken);
        setUser({ id: payload.userId, name: storedName, email: storedEmail });
      } else {
        localStorage.clear();
      }
    }
  }, []);

  const login = useCallback((newToken: string, name: string, email: string) => {
    const payload = parseJwt(newToken);
    if (!payload) return;

    localStorage.setItem('token', newToken);
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);

    setToken(newToken);
    setUser({ id: payload.userId, name, email });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    setToken(null);
    setUser(null);
    navigate('/login');
  }, [navigate]);

  const updateUser = useCallback((name: string, email: string) => {
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
    setUser((prev) => prev ? { ...prev, name, email } : null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
