import { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
  isAdmin: boolean;
  currentUser: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    setCurrentUser(storedUser);
    setIsAdmin(!!storedUser);
  }, []);

  // Simple in-app login (client-side). This intentionally uses a hardcoded
  // username/password so the app does not depend on Netlify functions or
  // environment variables during local development. Username/password:
  //   admin_RRBT02 / hpeblr
  // NOTE: This is less secure than server-side auth. If you later deploy to
  // production and want to protect admin access, replace this with a server
  // validation flow.
  // Support two client-side accounts:
  // - admin_RRBT02 / hpeblr  (regular admin)
  // - superadmin_RRBT / hpeblr  (super admin with extra reset powers)
  const VALID_USERS: Record<string, string> = {
    admin_RRBT02: 'hpeblr',
    superadmin_RRBT: 'hpeblr'
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    const expected = VALID_USERS[username];
    const ok = expected && expected === password;
    if (ok) {
      localStorage.setItem('currentUser', username);
      setCurrentUser(username);
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('currentUser');
    setIsAdmin(false);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, currentUser, login, logout }}>
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