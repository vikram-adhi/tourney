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

  // Simple in-app login (client-side). This intentionally uses a hardcoded
  // username/password so the app does not depend on Netlify functions or
  // environment variables during local development. Username/password:
  //   admin_RRBT / hpeblr
  // NOTE: This is less secure than server-side auth. If you later deploy to
  // production and want to protect admin access, replace this with a server
  // validation flow.
  const ADMIN_USER = 'admin_RRBT';
  const ADMIN_PASS = 'hpeblr';

  const login = async (username: string, password: string): Promise<boolean> => {
    const ok = username === ADMIN_USER && password === ADMIN_PASS;
    if (ok) {
      localStorage.setItem('isAdmin', 'true');
      setIsAdmin(true);
      return true;
    }
    return false;
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