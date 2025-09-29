'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Profile, OnboardingProgress, RoleDetails } from '@/types';
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

  // Onboarding functions
  needsOnboarding: boolean;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  updateOnboardingProgress: (progress: Partial<OnboardingProgress>) => Promise<void>;
  getRoleDetails: (role: 'agent' | 'seeker' | 'provider') => Promise<RoleDetails | null>;
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
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  // Onboarding functions
  const updateOnboardingProgress = async (progress: Partial<OnboardingProgress>) => {
    if (!user?.id) return;

    try {
      const currentProgress = profile?.onboarding_progress || {};
      const updatedProgress = { ...currentProgress, ...progress };

      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_progress: updatedProgress })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setProfile(prev => prev ? { ...prev, onboarding_progress: updatedProgress } : null);
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
      throw error;
    }
  };

  const getRoleDetails = async (role: 'agent' | 'seeker' | 'provider'): Promise<RoleDetails | null> => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase
        .from('role_details')
        .select('*')
        .eq('profile_id', user.id)
        .eq('role_type', role)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No role details found, which is expected for new users
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching role details:', error);
      return null;
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

    // Check if onboarding is needed
    const needsOnboarding = !profileData.onboarding_progress?.onboarding_completed;
    if (needsOnboarding) {
      setShowOnboarding(true);
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
  const needsOnboarding = !profile?.onboarding_progress?.onboarding_completed && !!user;

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
      isRoleSwitching,
      needsOnboarding,
      showOnboarding,
      setShowOnboarding,
      updateOnboardingProgress,
      getRoleDetails
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