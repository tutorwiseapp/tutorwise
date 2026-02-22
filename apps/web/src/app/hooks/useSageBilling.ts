/**
 * Filename: useSageBilling.ts
 * Purpose: Hook for Sage Pro billing page
 * Created: 2026-02-22
 */

'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import type { SageProSubscription } from '@/lib/stripe/sage-pro-subscription-utils';

interface UsageStats {
  tier: 'pro' | 'free';
  subscription: SageProSubscription | null;
  questions: {
    used: number;
    remaining: number;
    quota: number;
    allowed: boolean;
    percentage: number;
  };
  storage: {
    usedBytes: number;
    remainingBytes: number;
    quotaBytes: number;
    allowed: boolean;
    percentage: number;
  };
}

interface SubscriptionResponse {
  subscription: SageProSubscription | null;
  tier: 'pro' | 'free';
}

async function getSageSubscription(): Promise<SubscriptionResponse> {
  const response = await fetch('/api/sage/subscription');
  if (!response.ok) throw new Error('Failed to fetch subscription');
  return response.json();
}

async function getSageUsage(): Promise<UsageStats> {
  const response = await fetch('/api/sage/usage');
  if (!response.ok) throw new Error('Failed to fetch usage stats');
  return response.json();
}

export function useSageBilling() {
  const { profile, isLoading: profileLoading } = useUserProfile();

  // Fetch subscription data
  const {
    data: subscriptionData,
    isLoading: subscriptionLoading,
    isFetching: subscriptionFetching,
  } = useQuery({
    queryKey: ['sage-subscription', profile?.id],
    queryFn: getSageSubscription,
    enabled: !!profile?.id,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Fetch usage stats
  const {
    data: usageStats,
    isLoading: usageLoading,
    isFetching: usageFetching,
  } = useQuery({
    queryKey: ['sage-usage', profile?.id],
    queryFn: getSageUsage,
    enabled: !!profile?.id,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const subscription = subscriptionData?.subscription || null;
  const tier = subscriptionData?.tier || 'free';
  const isLoading = profileLoading || subscriptionLoading || usageLoading;

  return {
    // Data
    profile,
    subscription,
    tier,
    usageStats,

    // Loading states
    isLoading,
    subscriptionFetching,
    usageFetching,

    // Computed
    isPro: tier === 'pro',
  };
}
