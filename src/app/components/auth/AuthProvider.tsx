/*
 * Filename: src/app/components/auth/AuthProvider.tsx
 * Purpose: Provides a global authentication context powered by Supabase.
 *
 * Change History:
 * C002 - 2025-07-22 : 04:30 - Refactored to use Supabase's real-time auth instead of localStorage.
 * C001 - [Date] : [Time] - Initial creation with mock localStorage logic.
 *
 * Last Modified: 2025-07-22 : 04:30
 * Requirement ID (optional): VIN-B-03.1
 *
 * Change Summary:
 * The component has been completely re-architected to be the single source of truth for live
 * Supabase authentication. It now uses `supabase.auth.onAuthStateChange` to listen for logins,
 * logouts, and token refreshes. When a user is authenticated, it fetches their full profile
 * from the `profiles` table. The mock `login` and `logout` functions have been removed.
 *
 * Impact Analysis:
 * This is a foundational change that moves the entire application from a mock system to a live
 * backend. All components that use the `useAuth` hook will now receive real-time user data.
 *
 * Dependencies: "react", "@/types", "@/lib/supabaseClient".
 */
'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '@/types'; // Use the strict, canonical Profile type
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';

// The context now provides a strict Profile object or null.
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
    // This function fetches the user's profile data from our custom `profiles` table.
    const fetchUserProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(); // We expect only one row

      if (error) {
        console.error("Error fetching user profile:", error);
        setUser(null); // Ensure user is null if profile fetch fails
      } else {
        setUser(data);
      }
      setIsLoading(false);
    };

    // Supabase's onAuthStateChange is the real-time listener for all auth events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoading(true);
      if (session?.user) {
        // A user is logged in. Fetch their profile.
        fetchUserProfile(session.user.id);
      } else {
        // The user is logged out.
        setUser(null);
        setIsLoading(false);
      }
    });

    // The cleanup function unsubscribes from the listener when the component unmounts.
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
          {!isLoading && children}
        </main>
        <Footer />
      </div>
    </AuthContext.Provider>
  );
}