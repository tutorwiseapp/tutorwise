/**
 * Filename: ReferralAnalyticsDashboard.tsx
 * Purpose: Comprehensive analytics dashboard with conversion funnel and trends
 * Created: 2025-12-31
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { TrendingUp, TrendingDown, Users, Target, DollarSign, Calendar, ArrowRight } from 'lucide-react';
import { SkeletonLine, SkeletonRect } from '@/app/components/ui/feedback/LoadingSkeleton';
import styles from './ReferralAnalyticsDashboard.module.css';

interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  avg_time_in_stage: number;
  drop_off_rate: number;
}

interface PerformanceTrend {
  month_start: string;
  referral_count: number;
  conversion_count: number;
  conversion_rate: number;
  total_commission: number;
  rank_in_org: number;
}

interface RevenueForecast {
  forecast_month: string;
  conservative_estimate: number;
  realistic_estimate: number;
  optimistic_estimate: number;
  pipeline_value: number;
}

interface ReferralAnalyticsDashboardProps {
  organisationId: string;
  memberId?: string;
  isOwner: boolean;
}

export function ReferralAnalyticsDashboard({
  organisationId,
  memberId,
  isOwner,
}: ReferralAnalyticsDashboardProps) {
  const supabase = createClient();

  const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [forecast, setForecast] = useState<RevenueForecast[]>([]);
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '6m' | '1y'>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [organisationId, memberId, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '6m':
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      // Load funnel data
      const { data: funnelResult, error: funnelError } = await supabase.rpc(
        'get_conversion_funnel_analytics',
        {
          p_organisation_id: organisationId,
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString(),
        }
      );

      if (funnelError) throw funnelError;
      setFunnelData(funnelResult || []);

      // Load trends (only if member view)
      if (memberId) {
        const { data: trendsResult, error: trendsError } = await supabase.rpc(
          'get_member_performance_trends',
          {
            p_member_id: memberId,
            p_organisation_id: organisationId,
            p_months: 6,
          }
        );

        if (trendsError) throw trendsError;
        setTrends(trendsResult || []);
      }

      // Load forecast (only for owners)
      if (isOwner) {
        const { data: forecastResult, error: forecastError } = await supabase.rpc(
          'get_revenue_forecast',
          {
            p_organisation_id: organisationId,
            p_months_ahead: 3,
          }
        );

        if (forecastError) throw forecastError;
        setForecast(forecastResult || []);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatMonth = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric',
    });
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      referred: 'New Referrals',
      contacted: 'Contacted',
      meeting: 'Meeting Set',
      proposal: 'Proposal Sent',
      negotiating: 'Negotiating',
      converted: 'Converted',
    };
    return labels[stage] || stage;
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      referred: '#94a3b8',
      contacted: '#3b82f6',
      meeting: '#8b5cf6',
      proposal: '#f59e0b',
      negotiating: '#ec4899',
      converted: '#10b981',
    };
    return colors[stage] || '#94a3b8';
  };

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <div>
            <SkeletonLine style={{ width: '180px', height: '24px' }} />
            <SkeletonLine style={{ width: '350px', height: '16px', marginTop: '8px' }} />
          </div>
        </div>

        <div className={styles.section}>
          <SkeletonLine style={{ width: '200px', height: '20px', marginBottom: '16px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SkeletonRect style={{ width: '100%', height: '80px' }} />
            <SkeletonRect style={{ width: '100%', height: '80px' }} />
            <SkeletonRect style={{ width: '100%', height: '80px' }} />
          </div>
        </div>

        <div className={styles.section}>
          <SkeletonLine style={{ width: '150px', height: '20px', marginBottom: '16px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <SkeletonRect style={{ width: '100%', height: '120px' }} />
            <SkeletonRect style={{ width: '100%', height: '120px' }} />
            <SkeletonRect style={{ width: '100%', height: '120px' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Referral Analytics</h2>
          <p className={styles.subtitle}>
            {isOwner
              ? 'Comprehensive insights into your referral program performance'
              : 'Track your referral performance and trends'}
          </p>
        </div>

        {/* Time Range Selector */}
        <div className={styles.timeRangeSelector}>
          {(['30d', '90d', '6m', '1y'] as const).map((range) => (
            <button
              key={range}
              className={`${styles.timeRangeButton} ${
                timeRange === range ? styles.active : ''
              }`}
              onClick={() => setTimeRange(range)}
            >
              {range === '30d' && 'Last 30 Days'}
              {range === '90d' && 'Last 90 Days'}
              {range === '6m' && 'Last 6 Months'}
              {range === '1y' && 'Last Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Conversion Funnel</h3>
        <p className={styles.sectionSubtitle}>
          Track how referrals progress through your conversion pipeline
        </p>

        <div className={styles.funnelContainer}>
          {funnelData.map((stage, index) => {
            const isLast = index === funnelData.length - 1;
            const color = getStageColor(stage.stage);

            return (
              <div key={stage.stage} className={styles.funnelStage}>
                {/* Stage Bar */}
                <div className={styles.funnelBar}>
                  <div
                    className={styles.funnelBarFill}
                    style={{
                      width: `${stage.percentage}%`,
                      backgroundColor: color,
                    }}
                  >
                    <div className={styles.funnelBarLabel}>
                      <span className={styles.stageName}>{getStageLabel(stage.stage)}</span>
                      <span className={styles.stageCount}>{stage.count}</span>
                    </div>
                  </div>
                </div>

                {/* Stage Metrics */}
                <div className={styles.funnelMetrics}>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>Conversion Rate</span>
                    <span className={styles.metricValue}>{stage.percentage.toFixed(1)}%</span>
                  </div>
                  {stage.avg_time_in_stage > 0 && (
                    <div className={styles.metric}>
                      <span className={styles.metricLabel}>Avg Time</span>
                      <span className={styles.metricValue}>
                        {stage.avg_time_in_stage.toFixed(1)} days
                      </span>
                    </div>
                  )}
                  {!isLast && stage.drop_off_rate > 0 && (
                    <div className={styles.metric}>
                      <span className={styles.metricLabel}>Drop-off</span>
                      <span className={`${styles.metricValue} ${styles.negative}`}>
                        {stage.drop_off_rate.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                {!isLast && (
                  <div className={styles.funnelArrow}>
                    <ArrowRight size={24} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Member Performance Trends */}
      {memberId && trends.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Your Performance Trends</h3>
          <p className={styles.sectionSubtitle}>Track your monthly progress over time</p>

          <div className={styles.trendsGrid}>
            {trends.slice(0, 6).map((trend) => (
              <div key={trend.month_start} className={styles.trendCard}>
                <div className={styles.trendHeader}>
                  <span className={styles.trendMonth}>{formatMonth(trend.month_start)}</span>
                  {trend.rank_in_org > 0 && (
                    <span className={styles.trendRank}>#{trend.rank_in_org}</span>
                  )}
                </div>

                <div className={styles.trendStats}>
                  <div className={styles.trendStat}>
                    <Users size={16} />
                    <span>{trend.referral_count} referrals</span>
                  </div>
                  <div className={styles.trendStat}>
                    <Target size={16} />
                    <span>{trend.conversion_count} converted</span>
                  </div>
                  <div className={styles.trendStat}>
                    <TrendingUp size={16} />
                    <span>{trend.conversion_rate.toFixed(1)}% rate</span>
                  </div>
                  <div className={styles.trendStat}>
                    <DollarSign size={16} />
                    <span>{formatCurrency(trend.total_commission)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue Forecast */}
      {isOwner && forecast.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Revenue Forecast</h3>
          <p className={styles.sectionSubtitle}>
            Projected revenue based on current pipeline and historical conversion rates
          </p>

          <div className={styles.forecastGrid}>
            {forecast.map((item) => (
              <div key={item.forecast_month} className={styles.forecastCard}>
                <div className={styles.forecastMonth}>
                  <Calendar size={18} />
                  <span>{formatMonth(item.forecast_month)}</span>
                </div>

                <div className={styles.forecastValues}>
                  <div className={styles.forecastValue}>
                    <span className={styles.forecastLabel}>Pipeline Value</span>
                    <span className={styles.forecastAmount}>
                      {formatCurrency(item.pipeline_value)}
                    </span>
                  </div>

                  <div className={styles.forecastEstimates}>
                    <div className={styles.estimate}>
                      <span className={styles.estimateLabel}>Conservative</span>
                      <span className={styles.estimateAmount}>
                        {formatCurrency(item.conservative_estimate)}
                      </span>
                    </div>
                    <div className={`${styles.estimate} ${styles.realistic}`}>
                      <span className={styles.estimateLabel}>Realistic</span>
                      <span className={styles.estimateAmount}>
                        {formatCurrency(item.realistic_estimate)}
                      </span>
                    </div>
                    <div className={styles.estimate}>
                      <span className={styles.estimateLabel}>Optimistic</span>
                      <span className={styles.estimateAmount}>
                        {formatCurrency(item.optimistic_estimate)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Insights */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Key Insights</h3>
        <div className={styles.insightsGrid}>
          {funnelData.length > 0 && (
            <>
              <div className={styles.insightCard}>
                <div className={styles.insightIcon} style={{ color: '#10b981' }}>
                  <TrendingUp size={24} />
                </div>
                <div className={styles.insightContent}>
                  <div className={styles.insightValue}>
                    {funnelData.find((s) => s.stage === 'converted')?.count || 0}
                  </div>
                  <div className={styles.insightLabel}>Total Conversions</div>
                </div>
              </div>

              <div className={styles.insightCard}>
                <div className={styles.insightIcon} style={{ color: '#3b82f6' }}>
                  <Target size={24} />
                </div>
                <div className={styles.insightContent}>
                  <div className={styles.insightValue}>
                    {funnelData.find((s) => s.stage === 'converted')?.percentage.toFixed(1) ||
                      0}
                    %
                  </div>
                  <div className={styles.insightLabel}>Conversion Rate</div>
                </div>
              </div>

              {funnelData.find((s) => s.stage === 'converted' && s.avg_time_in_stage > 0) && (
                <div className={styles.insightCard}>
                  <div className={styles.insightIcon} style={{ color: '#f59e0b' }}>
                    <Calendar size={24} />
                  </div>
                  <div className={styles.insightContent}>
                    <div className={styles.insightValue}>
                      {funnelData
                        .find((s) => s.stage === 'converted')
                        ?.avg_time_in_stage.toFixed(0) || 0}{' '}
                      days
                    </div>
                    <div className={styles.insightLabel}>Avg Time to Convert</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
