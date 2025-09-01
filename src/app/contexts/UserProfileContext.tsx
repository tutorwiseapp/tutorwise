/*
 * Filename: src/app/contexts/UserProfileContext.tsx
 * Purpose: Provides a global context for the authenticated user's complete Supabase profile.
 * Change History:
 * C001 - 2025-09-01 : 19:00 - Initial creation.
 * Last Modified: 2025-09-01 : 19:00
 * Requirement ID: VIN-APP-01
 * Change Summary: This context was created to solve the core data-fetching issue post-migration. It uses the `useKindeBrowserClient` hook to detect an authenticated user and then makes a single, client-side API call to `/api/profile` to fetch the user's full profile data (including `agent_id`, `stripe_customer_id`, etc.) from the Supabase database. This complete profile is then made available to all child components via the `useUserProfile` hook.
 */
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import type { Profile } from '@/types';

interface UserProfileContextType {
  profile: Profile | null;
  isLoading: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated, isLoading: isKindeLoading } = useKindeBrowserClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      // Only fetch if Kinde has finished loading and the user is authenticated.
      if (!isKindeLoading && isAuthenticated && user) {
        setIsLoading(true);
        try {
          const response = await fetch('/api/profile'); 
          if (!response.ok) {
            // If the profile doesn't exist yet (data race), it's not a fatal error, just log it.
            console.error('Failed to fetch profile, it might not have been created yet.');
            setProfile(null);
            return;
          };
          const data: Profile = await response.json();
          setProfile(data);
        } catch (error) {
          console.error('Profile fetch API error:', error);
          setProfile(null);
        } finally {
          setIsLoading(false);
        }
      } else if (!isKindeLoading) {
        // If Kinde is done and there's no user, we are done loading.
        setIsLoading(false);
        setProfile(null);
      }
    };

    fetchProfile();
  }, [user, isAuthenticated, isKindeLoading]);

  return (
    <UserProfileContext.Provider value={{ profile, isLoading }}>
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