/*
 * Filename: src/app/contexts/UserProfileContext.tsx
 * Purpose: Provides a global context for the authenticated user's complete Supabase profile.
 * Change History:
 * C003 - 2025-09-02 : 17:00 - Migrated to use Supabase's onAuthStateChange listener.
 * C002 - 2025-09-01 : 19:00 - Added retry logic for Kinde.
 * C001 - 2025-09-01 : 19:00 - Initial creation.
 * Last Modified: 2025-09-02 : 17:00
 * Requirement ID: VIN-AUTH-MIG-05
 * Change Summary: This context has been fully migrated to Supabase Auth. It no longer uses the Kinde hook. Instead, it uses the Supabase Browser Client and its `onAuthStateChange` listener. This provides a robust, real-time mechanism to fetch the user's profile from `/api/profile` whenever they log in and to clear it when they log out.
 */
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Profile } from '@/types';
import type { User } from '@supabase/supabase-js';

interface UserProfileContextType {
  profile: Profile | null;
  user: User | null;
  isLoading: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async (sessionUser: User | null) => {
      if (sessionUser) {
        setIsLoading(true);
        try {
          const response = await fetch('/api/profile');
          if (!response.ok) {
            console.error('Failed to fetch profile, user may not be fully signed up.');
            setProfile(null); // Clear profile if fetch fails
          } else {
            const data: Profile = await response.json();
            setProfile(data);
          }
        } catch (error) {
          console.error('Profile fetch API error:', error);
          setProfile(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setProfile(null); // No session user, so no profile
        setIsLoading(false);
      }
    };

    // Immediately check for a session on initial load
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        await fetchProfile(session?.user ?? null);
    };

    checkSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      fetchProfile(sessionUser);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <UserProfileContext.Provider value={{ profile, user, isLoading }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};