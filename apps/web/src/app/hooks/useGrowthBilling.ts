/**
 * Filename: useGrowthBilling.ts
 * Purpose: Hook for Growth Pro billing — subscription status for sidebar widget
 * Created: 2026-03-05
 * Pattern: Mirrors useSageBilling
 */

'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { createClient } from '@/utils/supabase/client';
import type { GrowthProSubscription } from '@/lib/stripe/growth-pro-subscription';

async function fetchGrowthSubscription(): Promise<GrowthProSubscription | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('growth_pro_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as GrowthProSubscription;
}

export function useGrowthBilling() {
  const { profile, isLoading: profileLoading } = useUserProfile();

  const {
    data: subscription,
    isLoading: subscriptionLoading,
  } = useQuery({
    queryKey: ['growth-subscription', profile?.id],
    queryFn: fetchGrowthSubscription,
    enabled: !!profile?.id,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const isPro = subscription
    ? subscription.status === 'active' || subscription.status === 'past_due'
    : false;

  return {
    profile,
    subscription: subscription ?? null,
    isPro,
    isLoading: profileLoading || subscriptionLoading,
  };
}
