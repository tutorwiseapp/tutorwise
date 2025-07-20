'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import type { User } from '@/types'; // Or `Profile` if you have migrated

// --- Define the shape of the data our context will provide ---
// Using User for now to match Header.tsx
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

// --- Create the context ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Create the custom hook for easily accessing the context ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // This error is a clear signal to the developer.
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// --- Create the Provider component itself ---
export default function AuthProvider({ children }: { children: React.ReactNode; }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as true

  useEffect(() => {
    // This effect runs only on the client after the initial render.
    const loggedInUserString = localStorage.getItem('vinite_loggedin_user');
    if (loggedInUserString) {
      setUser(JSON.parse(loggedInUserString));
    }
    setIsLoading(false); // We are now finished checking.
  }, []);

  const login = (userData: User) => {
    localStorage.setItem('vinite_loggedin_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('vinite_loggedin_user');
    setUser(null);
  };
  
  // The value object MUST match the AuthContextType interface
  const value = { user, isLoading, login, logout };

  return (
    // The Provider component from React Context must wrap the children
    // and be given the value to share.
    <AuthContext.Provider value={value}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Don't render children until we know the auth status to prevent flicker */}
          {!isLoading && children}
        </main>
        <Footer />
      </div>
    </AuthContext.Provider>
  );
}