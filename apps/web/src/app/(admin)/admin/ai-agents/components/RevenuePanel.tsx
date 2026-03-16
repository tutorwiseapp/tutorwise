/**
 * Filename: src/app/(admin)/admin/ai-agents/components/RevenuePanel.tsx
 * Purpose: Revenue & billing analytics tab for AI Agents admin — MRR, subscriptions,
 *          session revenue, bundle purchases, top earners
 * Created: 2026-03-16
 * Pattern: Adapted from Sage Quota & Costs section
 */
'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { HubKPIGrid, HubKPICard, HubTrendChart, HubCategoryBreakdownChart } from '@/components/hub/charts';
import type { CategoryData } from '@/components/hub/charts';
import ErrorBoundary from '@/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/components/ui/feedback/LoadingSkeleton';
import { DollarSign, CreditCard, Package, TrendingUp, Users, PiggyBank } from 'lucide-react';
import styles from '../page.module.css';

// ── API response shape ──────────────────────────────────────────────
interface RevenueData {
  subscriptions: {
    total: number;
    active: number;
    canceled: number;
    pastDue: number;
  };
  mrr: number;
  totalSessionRevenue30d: number;
  platformFees30d: number;
  ownerEarnings30d: number;
  avgRevenuePerSession: number;
  bundlePurchases: { total: number; last30d: number };
  subscriptionStatusBreakdown: Array<{ label: string; value: number }>;
  revenueTrend: Array<{ label: string; value: number }>;
  topEarners: Array<{ id: string; name: string; revenue: number }>;
}

// ── Chart colours ───────────────────────────────────────────────────
const SUB_STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  past_due: '#F59E0B',
  canceled: '#EF4444',
  unpaid: '#DC2626',
  incomplete: '#6B7280',
  incomplete_expired: '#9CA3AF',
};

function humaniseSubStatus(raw: string): string {
  const map: Record<string, string> = {
    active: 'Active',
    past_due: 'Past Due',
    canceled: 'Canceled',
    unpaid: 'Unpaid',
    incomplete: 'Incomplete',
    incomplete_expired: 'Expired',
  };
  return map[raw] || raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatCurrency(value: number): string {
  return `\u00A3${value.toFixed(2)}`;
}

// ── Component ───────────────────────────────────────────────────────
export default function RevenuePanel() {
  const { data, isLoading, isError } = useQuery<RevenueData>({
    queryKey: ['admin-ai-agents-revenue'],
    queryFn: async () => {
      const res = await fetch('/api/admin/ai-agents/analytics?type=revenue');
      if (!res.ok) throw new Error('Failed to fetch revenue analytics');
      return res.json();
    },
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <>
        <ChartSkeleton height="120px" />
        <div className={styles.chartsSection}>
          <ChartSkeleton height="320px" />
          <ChartSkeleton height="320px" />
        </div>
      </>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.fallbackMessage}>
        Unable to load revenue analytics. Please try again later.
      </div>
    );
  }

  // ── Derived chart data ──────────────────────────────────────────
  const subStatusData: CategoryData[] = data.subscriptionStatusBreakdown.map((s) => ({
    label: humaniseSubStatus(s.label),
    value: s.value,
    color: SUB_STATUS_COLORS[s.label] || '#6B7280',
  }));

  // Revenue split: platform fees vs owner earnings
  const revenueSplitData: CategoryData[] = [
    { label: 'Platform Fees (10%)', value: data.platformFees30d, color: '#3B82F6' },
    { label: 'Owner Earnings (90%)', value: data.ownerEarnings30d, color: '#10B981' },
  ];

  return (
    <>
      {/* KPI Cards */}
      <HubKPIGrid>
        <HubKPICard
          label="MRR (Subscriptions)"
          value={formatCurrency(data.mrr)}
          sublabel={`${data.subscriptions.active} active subscriptions`}
          icon={DollarSign}
        />
        <HubKPICard
          label="Session Revenue (30d)"
          value={formatCurrency(data.totalSessionRevenue30d)}
          sublabel={`${formatCurrency(data.avgRevenuePerSession)} avg/session`}
          icon={TrendingUp}
        />
        <HubKPICard
          label="Platform Fees (30d)"
          value={formatCurrency(data.platformFees30d)}
          sublabel="10% commission"
          icon={PiggyBank}
        />
        <HubKPICard
          label="Total Subscriptions"
          value={data.subscriptions.total}
          sublabel={`${data.subscriptions.canceled} canceled, ${data.subscriptions.pastDue} past due`}
          icon={CreditCard}
        />
        <HubKPICard
          label="Bundle Purchases"
          value={data.bundlePurchases.total}
          sublabel={`${data.bundlePurchases.last30d} in last 30 days`}
          icon={Package}
        />
        <HubKPICard
          label="Active Subscribers"
          value={data.subscriptions.active}
          icon={Users}
        />
      </HubKPIGrid>

      {/* Charts */}
      <div className={styles.chartsSection}>
        {/* Revenue Trend */}
        <ErrorBoundary fallback={<div className={styles.fallbackMessage}>Unable to load revenue trend</div>}>
          <HubTrendChart
            data={data.revenueTrend}
            title="Daily Revenue"
            subtitle="Last 30 days"
            valueName="Revenue"
            lineColor="#10B981"
          />
        </ErrorBoundary>

        {/* Subscription Status */}
        <ErrorBoundary fallback={<div className={styles.fallbackMessage}>Unable to load subscription breakdown</div>}>
          <HubCategoryBreakdownChart
            data={subStatusData}
            title="Subscription Status"
            subtitle="All AI agent subscriptions"
          />
        </ErrorBoundary>

        {/* Revenue Split */}
        {(data.platformFees30d > 0 || data.ownerEarnings30d > 0) && (
          <ErrorBoundary fallback={<div className={styles.fallbackMessage}>Unable to load revenue split</div>}>
            <HubCategoryBreakdownChart
              data={revenueSplitData}
              title="Revenue Split (30d)"
              subtitle="Platform fees vs owner earnings"
            />
          </ErrorBoundary>
        )}

        {/* Top Earners */}
        {data.topEarners.length > 0 && (
          <div>
            <h2 className={styles.placeholderTitle} style={{ textAlign: 'left', color: 'var(--color-text-primary, #1e293b)' }}>
              Top Earning Agents (30d)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {data.topEarners.map((agent) => (
                <div
                  key={agent.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.625rem 0.75rem',
                    borderBottom: '1px solid var(--color-border-light, #f1f5f9)',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary, #1e293b)' }}>
                    {agent.name}
                  </span>
                  <span style={{
                    display: 'inline-block',
                    minWidth: '3rem',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textAlign: 'center',
                    color: '#065f46',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                  }}>
                    {formatCurrency(agent.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
