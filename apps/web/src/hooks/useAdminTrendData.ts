/**
 * Filename: src/hooks/useAdminTrendData.ts
 * Purpose: React hook for fetching admin trend data from platform_statistics_daily
 * Created: 2025-12-27
 *
 * This hook queries the platform_statistics_daily table to retrieve historical
 * trend data for the specified metric over a given number of days.
 *
 * Example usage:
 * ```tsx
 * const { data, isLoading } = useAdminTrendData({
 *   metric: 'listings_total',
 *   days: 7
 * });
 * ```
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import type { MetricName } from './useAdminMetric';
import type { TrendDataPoint } from '@/app/components/hub/charts';

export interface UseAdminTrendDataOptions {
  metric: MetricName;
  days?: number; // Number of days to look back (default: 7)
}

export interface UseAdminTrendDataResult {
  data: TrendDataPoint[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Fetches historical trend data for a metric from platform_statistics_daily
 *
 * @param options - Configuration options
 * @returns Trend data array with date, value, and label
 */
export function useAdminTrendData({
  metric,
  days = 7,
}: UseAdminTrendDataOptions): UseAdminTrendDataResult {
  const supabase = createClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-trend-data', metric, days],
    queryFn: async () => {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1)); // Include today

      // Format dates for SQL query (YYYY-MM-DD)
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Query platform_statistics_daily table
      const { data: rows, error } = await supabase
        .from('platform_statistics_daily')
        .select(`date, ${metric}`)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: true });

      if (error) {
        // Log error but don't throw - return empty array so fallback data is used
        console.warn(`[useAdminTrendData] Column "${metric}" not found in platform_statistics_daily. Using fallback data.`);
        return [];
      }

      // Transform data to TrendDataPoint format
      const trendData: TrendDataPoint[] = (rows || []).map((row: any) => {
        const date = new Date(row.date);
        const label = date.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        }); // e.g., "20 Dec"

        return {
          date: row.date,
          value: row[metric] || 0,
          label,
        };
      });

      // Fill in missing dates with 0 values
      const filledData: TrendDataPoint[] = [];
      for (let i = 0; i < days; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        const currentDateStr = currentDate.toISOString().split('T')[0];

        const existingDataPoint = trendData.find((d) => d.date === currentDateStr);

        if (existingDataPoint) {
          filledData.push(existingDataPoint);
        } else {
          // Fill missing date with 0
          const label = currentDate.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          });
          filledData.push({
            date: currentDateStr,
            value: 0,
            label,
          });
        }
      }

      return filledData;
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Generate fallback data for the last N days with 0 values
  // This ensures charts render properly even when there's no data or an error
  const generateFallbackData = (): TrendDataPoint[] => {
    const fallbackData: TrendDataPoint[] = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      const currentDateStr = currentDate.toISOString().split('T')[0];
      const label = currentDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      });

      fallbackData.push({
        date: currentDateStr,
        value: 0,
        label,
      });
    }

    return fallbackData;
  };

  return {
    data: (data && data.length > 0) ? data : generateFallbackData(),
    isLoading,
    isError,
    error: error as Error | null,
  };
}
