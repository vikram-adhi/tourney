import { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const adminStatus = localStorage.getItem('isAdmin') === 'true';
    setIsAdmin(adminStatus);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.status === 200) {
        localStorage.setItem('isAdmin', 'true');
        setIsAdmin(true);
        return true;
      }
      // If server returns non-200, fall back to dev-only client env vars when present
      // (Vite exposes variables prefixed with VITE_). This is only a local convenience.
      const devUser = import.meta.env.VITE_ADMIN_USER as string | undefined;
      const devPass = import.meta.env.VITE_ADMIN_PASS as string | undefined;
      if (devUser && devPass) {
        if (username === devUser && password === devPass) {
          localStorage.setItem('isAdmin', 'true');
          setIsAdmin(true);
          return true;
        }
      }
      return false;
    } catch (err) {
      // network error - try vite env fallback for local dev convenience
      const devUser = import.meta.env.VITE_ADMIN_USER as string | undefined;
      const devPass = import.meta.env.VITE_ADMIN_PASS as string | undefined;
      if (devUser && devPass) {
        if (username === devUser && password === devPass) {
          localStorage.setItem('isAdmin', 'true');
          setIsAdmin(true);
          return true;
        }
      }
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('isAdmin');
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}