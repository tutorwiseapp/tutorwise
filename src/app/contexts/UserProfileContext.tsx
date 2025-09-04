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
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sessionUser.id)
            .single();
          
          if (error) {
             console.error('Error fetching profile:', error);
             setProfile(null);
          } else {
            setProfile(data);
          }
        } catch (error) {
          console.error('Unexpected error fetching profile:', error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    };

    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      await fetchProfile(session?.user ?? null);

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        fetchProfile(sessionUser);
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    };

    initialize();
  }, []);

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