/**
 * Filename: src/app/(admin)/admin/edupay/hooks/useAdminEduPayMetrics.ts
 * Purpose: React hook for fetching EduPay admin dashboard metrics
 * Created: 2026-02-12
 * Pattern: Follows useAdminMetric.ts pattern for consistency
 *
 * This hook aggregates data from edupay_wallets, edupay_ledger, and edupay_conversions
 * tables to provide real-time admin oversight metrics.
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export interface EduPayMetrics {
  totalEpInCirculation: number;
  totalWallets: number;
  activeWallets: number;
  totalConversions: number;
  pendingConversions: number;
  failedConversions: number;
  completedConversions: number;
  totalEpConverted: number;
  platformFeesCollected: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAdminEduPayMetrics(): EduPayMetrics {
  const supabase = createClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-edupay-metrics'],
    queryFn: async () => {
      // Fetch wallet aggregates
      const { data: walletStats, error: walletError } = await supabase
        .from('edupay_wallets')
        .select('total_ep, available_ep, pending_ep, converted_ep');

      if (walletError) {
        throw new Error(`Failed to fetch wallet stats: ${walletError.message}`);
      }

      // Calculate wallet metrics
      const totalWallets = walletStats?.length || 0;
      const activeWallets = walletStats?.filter(w => w.total_ep > 0).length || 0;
      const totalEpInCirculation = walletStats?.reduce((sum, w) => sum + (w.total_ep || 0), 0) || 0;

      // Fetch conversion aggregates
      const { data: conversions, error: conversionError } = await supabase
        .from('edupay_conversions')
        .select('ep_amount, status, platform_fee_pence');

      if (conversionError) {
        throw new Error(`Failed to fetch conversion stats: ${conversionError.message}`);
      }

      // Calculate conversion metrics
      const totalConversions = conversions?.length || 0;
      const pendingConversions = conversions?.filter(c => c.status === 'pending' || c.status === 'processing').length || 0;
      const failedConversions = conversions?.filter(c => c.status === 'failed').length || 0;
      const completedConversions = conversions?.filter(c => c.status === 'completed').length || 0;
      const totalEpConverted = conversions?.reduce((sum, c) => sum + (c.ep_amount || 0), 0) || 0;
      const platformFeesCollected = conversions?.filter(c => c.status === 'completed').reduce((sum, c) => sum + (c.platform_fee_pence || 0), 0) || 0;

      return {
        totalEpInCirculation,
        totalWallets,
        activeWallets,
        totalConversions,
        pendingConversions,
        failedConversions,
        completedConversions,
        totalEpConverted,
        platformFeesCollected,
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000, // 30 seconds - refresh more frequently for admin
    gcTime: 5 * 60_000, // 5 minutes
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 60_000, // Auto-refresh every minute
    retry: 2,
  });

  return {
    totalEpInCirculation: data?.totalEpInCirculation ?? 0,
    totalWallets: data?.totalWallets ?? 0,
    activeWallets: data?.activeWallets ?? 0,
    totalConversions: data?.totalConversions ?? 0,
    pendingConversions: data?.pendingConversions ?? 0,
    failedConversions: data?.failedConversions ?? 0,
    completedConversions: data?.completedConversions ?? 0,
    totalEpConverted: data?.totalEpConverted ?? 0,
    platformFeesCollected: data?.platformFeesCollected ?? 0,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
