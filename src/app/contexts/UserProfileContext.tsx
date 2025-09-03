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
    // --- THIS IS THE FIX ---
    // This function now fetches the profile directly using the client-side Supabase instance,
    // which avoids the race condition of calling the /api/profile route.
    const fetchProfileDirectly = async (sessionUser: User | null) => {
      if (sessionUser) {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sessionUser.id)
            .single();
          
          if (error) {
             console.error('Error fetching profile directly:', error);
             setProfile(null);
          } else {
            setProfile(data);
          }
        } catch (error) {
          console.error('An unexpected error occurred during profile fetch:', error);
          setProfile(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    };

    // Immediately check for a session on initial load
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        await fetchProfileDirectly(session?.user ?? null);
    };

    checkSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      fetchProfileDirectly(sessionUser); // Call the direct fetch method here as well
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); // Supabase client is stable, so empty dependency is fine here.

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