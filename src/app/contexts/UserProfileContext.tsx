/*
 * Filename: src/app/contexts/UserProfileContext.tsx
 * Purpose: Provides a global context for the authenticated user's complete Supabase profile.
 * Change History:
 * C002 - 2025-09-02 : 13:00 - Definitive fix for infinite loading with retry logic.
 * C001 - 2025-09-01 : 19:00 - Initial creation.
 * Last Modified: 2025-09-02 : 13:00
 * Requirement ID: VIN-APP-01
 * Change Summary: This is the definitive fix for the infinite loading loop on authenticated pages. A robust retry mechanism has been added to the `fetchProfile` function. If the initial fetch fails (e.g., due to a minor database replication delay after the kinde-callback creates the user), it will now retry up to 3 times before concluding that the user is not logged in. This resolves the race condition that was causing the redirect loop.
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
      if (isKindeLoading) return;

      if (isAuthenticated && user) {
        setIsLoading(true);
        
        // --- THIS IS THE DEFINITIVE FIX ---
        // Implement a retry mechanism to handle potential db replication lag.
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const response = await fetch('/api/profile');
            if (response.ok) {
              const data: Profile = await response.json();
              setProfile(data);
              setIsLoading(false);
              return; // Success, exit the loop
            }
          } catch (error) {
            console.error(`Attempt ${attempt}: Profile fetch failed`, error);
          }
          // If not successful, wait before the next attempt.
          if (attempt < 3) {
            await new Promise(res => setTimeout(res, 500));
          }
        }
        
        // If all attempts fail, conclude that there's an issue.
        console.error("All attempts to fetch profile failed.");
        setProfile(null);
        setIsLoading(false);

      } else {
        setProfile(null);
        setIsLoading(false);
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