/**
 * Filename: src/app/(admin)/admin/edupay/hooks/useAdminEduPayTrends.ts
 * Purpose: React hook for fetching EduPay trend data for charts
 * Created: 2026-02-12
 * Pattern: Follows useAdminTrendData.ts pattern for consistency
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';

export interface TrendDataPoint {
  date: string;
  label: string;
  value: number;
}

interface UseAdminEduPayTrendsOptions {
  days?: number;
}

interface UseAdminEduPayTrendsResult {
  data: TrendDataPoint[] | null;
  isLoading: boolean;
  error: Error | null;
}

export function useAdminEduPayTrends({
  days = 7,
}: UseAdminEduPayTrendsOptions = {}): UseAdminEduPayTrendsResult {
  const supabase = createClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-edupay-trends', days],
    queryFn: async () => {
      // Calculate start date
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch ledger entries grouped by date for the trend
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('edupay_ledger')
        .select('created_at, ep_amount')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('type', 'earn')
        .eq('status', 'cleared');

      if (ledgerError) {
        throw new Error(`Failed to fetch ledger trends: ${ledgerError.message}`);
      }

      // Group by date
      const dateMap = new Map<string, number>();

      // Initialize all dates in range
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dateMap.set(dateStr, 0);
      }

      // Aggregate EP earned per day
      ledgerData?.forEach((entry) => {
        const dateStr = new Date(entry.created_at).toISOString().split('T')[0];
        const current = dateMap.get(dateStr) || 0;
        dateMap.set(dateStr, current + (entry.ep_amount || 0));
      });

      // Convert to array sorted by date
      const trendData: TrendDataPoint[] = Array.from(dateMap.entries())
        .map(([date, value]) => {
          // Format date as short label (e.g., "Feb 12")
          const dateObj = new Date(date);
          const label = dateObj.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
          return { date, label, value };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      return trendData;
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000, // 1 minute
    gcTime: 5 * 60_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  return {
    data: data || null,
    isLoading,
    error: error as Error | null,
  };
}
