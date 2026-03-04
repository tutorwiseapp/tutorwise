'use client';

/**
 * Filename: GrowthStatsWidget.tsx
 * Purpose: Live usage stats widget at top of Growth sidebar
 * Pattern: Mirrors SageProgressWidget — uses HubStatsCard
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import HubStatsCard, { type StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';
import type { GrowthProSubscription } from '@/lib/stripe/growth-pro-subscription';

interface GrowthStatsWidgetProps {
  profileId?: string;
  subscription?: GrowthProSubscription | null;
}

export default function GrowthStatsWidget({ profileId, subscription }: GrowthStatsWidgetProps) {
  const { data: todayCount = 0 } = useQuery({
    queryKey: ['growth-questions-today', profileId],
    queryFn: async () => {
      if (!profileId) return 0;
      const supabase = createClient();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from('growth_usage_log')
        .select('question_count')
        .eq('user_id', profileId)
        .gte('created_at', today.toISOString());
      return (data ?? []).reduce((sum, r) => sum + (r.question_count ?? 1), 0);
    },
    enabled: !!profileId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const isPro = subscription &&
    (subscription.status === 'active' || subscription.status === 'past_due');

  const dailyLimit = isPro ? 500 : 10;
  const monthlyUsed = subscription?.questions_used_this_period ?? 0;
  const monthlyLimit = subscription?.questions_limit ?? 5000;

  const stats: StatRow[] = [
    {
      label: 'Plan',
      value: isPro ? 'Growth Pro' : 'Free',
      valueColor: isPro ? 'green' : 'default',
    },
    {
      label: 'Questions Today',
      value: `${todayCount} / ${dailyLimit}`,
      valueColor: todayCount >= dailyLimit ? 'red' : todayCount >= dailyLimit * 0.8 ? 'orange' : 'default',
    },
    {
      label: isPro ? 'This Month' : 'Monthly Quota',
      value: isPro ? `${monthlyUsed} / ${monthlyLimit}` : 'Upgrade for 5,000',
      valueColor: isPro
        ? monthlyUsed >= monthlyLimit * 0.9 ? 'orange' : 'default'
        : 'default',
    },
  ];

  return <HubStatsCard title="Growth Usage" stats={stats} />;
}
