// src/app/components/auth/AuthProvider.tsx - REFACTORED

'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import type { User } from '@/types';
// We no longer need usePathname or initializeMockData here

interface AuthContextType {
  user: User | null;
  isLoading: boolean; // <-- ADD a loading state to the context
  login: (userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default function AuthProvider({ children }: { children: React.ReactNode; }) {
  const [user, setUser] = useState<User | null>(null);
  // This state is the key to preventing hydration errors
  const [isLoading, setIsLoading] = useState(true); 

  useEffect(() => {
    // This effect runs ONLY on the client, after the initial render.
    try {
      const loggedInUserString = localStorage.getItem('vinite_loggedin_user');
      if (loggedInUserString) {
        setUser(JSON.parse(loggedInUserString));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      setUser(null);
    }
    // We are now finished checking localStorage, so we can allow rendering.
    setIsLoading(false); 
  }, []);

  const login = (userData: User) => {
    localStorage.setItem('vinite_loggedin_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('vinite_loggedin_user');
    setUser(null);
  };

  const value = { user, isLoading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Don't render children until we know the auth status */}
          {!isLoading && children}
        </main>
        <Footer />
      </div>
    </AuthContext.Provider>
  );
}