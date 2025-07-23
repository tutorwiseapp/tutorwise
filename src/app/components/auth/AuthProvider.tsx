/*
 * Filename: src/app/components/auth/AuthProvider.tsx
 * ... (header is correct)
 *
 * Change Summary:
 * The `AuthProvider` is now the single source of truth for authentication state. It no longer
 * provides mock login/logout functions and instead uses Supabase's real-time auth listener.
 * This is the core of the live backend migration.
 */
'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '@/types';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
// We no longer need useRouter here

interface AuthContextType {
  user: Profile | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default function AuthProvider({ children }: { children: React.ReactNode; }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Error fetching user profile:", error);
        setUser(null);
      } else {
        setUser(data);
      }
      setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoading(true);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const value = { user, isLoading };

  return (
    <AuthContext.Provider value={value}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
        <Footer />
      </div>
    </AuthContext.Provider>
  );
}