// src/app/contexts/UserProfileContext.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Profile, OnboardingProgress, Role } from '@/types';
import type { User } from '@supabase/supabase-js';
import { useFreeHelpHeartbeat } from '@/app/hooks/useFreeHelpHeartbeat';

interface RolePreferences {
  lastActiveRole?: Role;
  dashboardLayout?: Record<string, any>;
  notifications?: Record<string, boolean>;
  customizations?: Record<string, any>;
}

interface UserProfileContextType {
  profile: Profile | null;
  user: User | null;
  activeRole: Role | null;
  availableRoles: Role[];
  switchRole: (role: Role) => Promise<void>;
  setActiveRole: (role: Role) => void;
  rolePreferences: RolePreferences;
  updateRolePreferences: (preferences: Partial<RolePreferences>) => Promise<void>;
  isLoading: boolean;
  isRoleSwitching: boolean;

  // Onboarding functions
  needsOnboarding: boolean;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  updateOnboardingProgress: (progress: Partial<OnboardingProgress>) => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRole, setActiveRoleState] = useState<Role | null>(null);
  const [rolePreferences, setRolePreferences] = useState<RolePreferences>({});
  const [isRoleSwitching, setIsRoleSwitching] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Role management functions
  const switchRole = async (role: Role) => {
    if (!profile || !(profile.roles || []).includes(role)) {
      throw new Error(`User does not have access to role: ${role}`);
    }

    setIsRoleSwitching(true);
    try {
      localStorage.setItem('activeRole', role);
      await updateRolePreferences({ lastActiveRole: role });

      // Update in database
      const { error } = await supabase
        .from('profiles')
        .update({ active_role: role })
        .eq('id', user!.id);

      if (error) throw error;

      setActiveRoleState(role);
      setProfile(prev => prev ? { ...prev, active_role: role } : null);
    } catch (error) {
      console.error('Error switching role:', error);
      throw error;
    } finally {
      setIsRoleSwitching(false);
    }
  };

  const setActiveRole = (role: Role) => {
    setActiveRoleState(role);
    if (profile && user) {
      supabase
        .from('profiles')
        .update({ active_role: role })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.error('Error setting active role:', error);
          else setProfile((prev) => prev ? { ...prev, active_role: role } : prev);
        });
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
      const currentProgress: Partial<OnboardingProgress> = profile?.onboarding_progress || {};

      // Deep merge for role-specific progress
      const updatedProgress: OnboardingProgress = {
        ...currentProgress,
        ...progress,
        client: {
          ...(currentProgress.client || {}),
          ...(progress.client || {}),
        },
        tutor: {
          ...(currentProgress.tutor || {}),
          ...(progress.tutor || {}),
        },
        agent: {
          ...(currentProgress.agent || {}),
          ...(progress.agent || {}),
        },
        last_updated: new Date().toISOString(),
        onboarding_completed: progress.onboarding_completed ?? currentProgress.onboarding_completed ?? false,
      };

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

  const refreshProfile = async (): Promise<Profile | null> => {
    if (!user?.id) return null;

    try {
      console.log('[UserProfileContext] Refreshing profile...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[UserProfileContext] Error refreshing profile:', error);
        return null;
      }

      console.log('[UserProfileContext] Profile refreshed:', data);
      setProfile(data);
      return data;
    } catch (error) {
      console.error('[UserProfileContext] Unexpected error refreshing profile:', error);
      return null;
    }
  };

  const initializeRole = (profileData: Profile) => {
    const savedRole = localStorage.getItem('activeRole') as Role | null;

    // Handle case where roles might be null or undefined
    const roles = profileData.roles || [];

    if (savedRole && roles.includes(savedRole)) {
      setActiveRoleState(savedRole);
    } else if (profileData.active_role) {
      setActiveRoleState(profileData.active_role);
    } else if (roles.length > 0) {
      setActiveRoleState(roles[0]);
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
    let mounted = true;
    const supabaseClient = createClient();

    const fetchProfile = async (sessionUser: User | null) => {
      if (!mounted) return;

      console.log('[UserProfileContext] Fetching profile for user:', sessionUser?.id);

      if (sessionUser) {
        try {
          const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', sessionUser.id)
            .single();

          if (!mounted) return;

          if (error) {
            console.error('[UserProfileContext] Error fetching profile:', error);
            setProfile(null);
            setActiveRoleState(null);
          } else {
            console.log('[UserProfileContext] Profile loaded:', {
              id: data?.id,
              email: data?.email,
              first_name: data?.first_name,
              last_name: data?.last_name,
              full_name: data?.full_name,
              hasFirstName: !!data?.first_name,
              hasLastName: !!data?.last_name
            });
            setProfile(data);
            initializeRole(data);
          }
        } catch (error) {
          console.error('[UserProfileContext] Unexpected error fetching profile:', error);
          setProfile(null);
          setActiveRoleState(null);
        }
      } else {
        console.log('[UserProfileContext] No user session, clearing profile');
        setProfile(null);
        setActiveRoleState(null);
      }

      if (mounted) {
        console.log('[UserProfileContext] Setting isLoading to false');
        setIsLoading(false);
      }
    };

    const initialize = async () => {
      console.log('[UserProfileContext] Initializing...');
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (!mounted) return;

      setUser(session?.user ?? null);
      await fetchProfile(session?.user ?? null);

      const { data: authListener } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        if (!mounted) return;

        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        await fetchProfile(sessionUser);
      });

      return () => {
        mounted = false;
        authListener.subscription.unsubscribe();
      };
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  const availableRoles = profile?.roles || [];
  const needsOnboarding = !profile?.onboarding_progress?.onboarding_completed && !!user;

  // v5.9: Free Help Now heartbeat system
  // Only run heartbeat for tutors who have free help enabled
  const isFreeHelpEnabled = profile?.available_free_help === true;
  const isTutor = activeRole === 'tutor';

  useFreeHelpHeartbeat({
    enabled: isTutor && isFreeHelpEnabled,
    onExpired: async () => {
      console.log('[Free Help] Presence expired, updating profile state');
      // Refresh profile to sync with database
      await refreshProfile();
    },
  });

  return (
    <UserProfileContext.Provider value={{
      profile,
      user,
      activeRole: activeRole,
      availableRoles,
      switchRole,
      setActiveRole,
      rolePreferences,
      updateRolePreferences,
      isLoading,
      isRoleSwitching,
      needsOnboarding,
      showOnboarding,
      setShowOnboarding,
      updateOnboardingProgress,
      refreshProfile
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
