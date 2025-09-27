'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Profile } from '@/types';
import type { User } from '@supabase/supabase-js';

interface RolePreferences {
  lastActiveRole?: 'agent' | 'seeker' | 'provider';
  dashboardLayout?: Record<string, any>;
  notifications?: Record<string, boolean>;
  customizations?: Record<string, any>;
}

interface UserProfileContextType {
  profile: Profile | null;
  user: User | null;
  activeRole: 'agent' | 'seeker' | 'provider' | null;
  availableRoles: ('agent' | 'seeker' | 'provider')[];
  switchRole: (role: 'agent' | 'seeker' | 'provider') => Promise<void>;
  rolePreferences: RolePreferences;
  updateRolePreferences: (preferences: Partial<RolePreferences>) => Promise<void>;
  isLoading: boolean;
  isRoleSwitching: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<'agent' | 'seeker' | 'provider' | null>(null);
  const [rolePreferences, setRolePreferences] = useState<RolePreferences>({});
  const [isRoleSwitching, setIsRoleSwitching] = useState(false);

  // Role management functions
  const switchRole = async (role: 'agent' | 'seeker' | 'provider') => {
    if (!profile || !profile.roles.includes(role)) {
      throw new Error(`User does not have access to role: ${role}`);
    }

    setIsRoleSwitching(true);
    try {
      localStorage.setItem('activeRole', role);
      await updateRolePreferences({ lastActiveRole: role });
      setActiveRole(role);
    } catch (error) {
      console.error('Error switching role:', error);
      throw error;
    } finally {
      setIsRoleSwitching(false);
    }
  };

  const updateRolePreferences = async (preferences: Partial<RolePreferences>) => {
    if (!user) return;

    try {
      const updatedPreferences = { ...rolePreferences, ...preferences };
      localStorage.setItem('rolePreferences', JSON.stringify(updatedPreferences));
      setRolePreferences(updatedPreferences);
    } catch (error) {
      console.error('Error updating role preferences:', error);
      throw error;
    }
  };

  const initializeRole = (profileData: Profile) => {
    if (!profileData.roles || profileData.roles.length === 0) {
      setActiveRole(null);
      return;
    }

    const savedRole = localStorage.getItem('activeRole') as 'agent' | 'seeker' | 'provider' | null;

    if (savedRole && profileData.roles.includes(savedRole)) {
      setActiveRole(savedRole);
    } else {
      setActiveRole(profileData.roles[0]);
    }

    const savedPreferences = localStorage.getItem('rolePreferences');
    if (savedPreferences) {
      try {
        setRolePreferences(JSON.parse(savedPreferences));
      } catch (error) {
        console.error('Error parsing role preferences:', error);
        setRolePreferences({});
      }
    }
  };

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
             setActiveRole(null);
          } else {
            setProfile(data);
            initializeRole(data);
          }
        } catch (error) {
          console.error('Unexpected error fetching profile:', error);
          setProfile(null);
          setActiveRole(null);
        }
      } else {
        setProfile(null);
        setActiveRole(null);
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
  }, [supabase]);

  const availableRoles = profile?.roles || [];

  return (
    <UserProfileContext.Provider value={{
      profile,
      user,
      activeRole,
      availableRoles,
      switchRole,
      rolePreferences,
      updateRolePreferences,
      isLoading,
      isRoleSwitching
    }}>
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