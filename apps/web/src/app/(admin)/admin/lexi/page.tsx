/*
 * Filename: src/app/(admin)/admin/lexi/page.tsx
 * Purpose: Lexi AI Assistant Analytics Dashboard
 * Created: 2026-02-13
 *
 * Pattern: Follows Admin Dashboard pattern with HubPageLayout + HubTabs + 4-card sidebar
 */
'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import Button from '@/app/components/ui/actions/Button';
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

type TabFilter = 'overview' | 'conversations' | 'feedback' | 'providers';

interface SummaryStats {
  totalConversations: number;
  totalMessages: number;
  uniqueUsers: number;
  avgMessagesPerConversation: number;
  feedbackPositive: number;
  feedbackNegative: number;
  topIntents: Array<{ intent: string; count: number }>;
}

interface BreakdownData {
  byPersona: Record<string, number>;
  byProvider: Record<string, number>;
}

interface ProviderInfo {
  type: string;
  name: string;
  description: string;
  available: boolean;
  requiresApiKey: boolean;
  envVar?: string;
  current: boolean;
}

interface ProviderData {
  current: string;
  currentName: string;
  providers: ProviderInfo[];
}

export default function LexiAnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFilter = (searchParams?.get('tab') as TabFilter) || 'overview';

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (tabId === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', tabId);
    }
    router.push(`/admin/lexi${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Fetch summary stats
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin', 'lexi', 'summary'],
    queryFn: async () => {
      const response = await fetch('/api/admin/lexi/analytics?type=summary');
      if (!response.ok) throw new Error('Failed to fetch summary');
      const data = await response.json();
      return data.stats as SummaryStats;
    },
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });

  // Fetch breakdown data
  const { data: breakdownData, isLoading: breakdownLoading } = useQuery({
    queryKey: ['admin', 'lexi', 'breakdown'],
    queryFn: async () => {
      const response = await fetch('/api/admin/lexi/analytics?type=breakdown');
      if (!response.ok) throw new Error('Failed to fetch breakdown');
      const data = await response.json();
      return data.breakdown as BreakdownData;
    },
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

  // Calculate feedback rate
  const feedbackTotal = (summaryData?.feedbackPositive || 0) + (summaryData?.feedbackNegative || 0);
  const feedbackRate = feedbackTotal > 0
    ? Math.round((summaryData?.feedbackPositive || 0) / feedbackTotal * 100)
    : 0;

  return (
    <ErrorBoundary>
      <HubPageLayout
        header={
          <HubHeader
            title="Lexi Analytics"
            subtitle="AI Assistant Usage & Performance"
            className={styles.lexiHeader}
            actions={
              <Button variant="secondary" size="sm" onClick={() => router.push('/admin')}>
                Back to Dashboard
              </Button>
            }
          />
        }
        tabs={
          <HubTabs
            tabs={[
              { id: 'overview', label: 'Overview', active: tabFilter === 'overview' },
              { id: 'conversations', label: 'Conversations', active: tabFilter === 'conversations' },
              { id: 'feedback', label: 'Feedback', active: tabFilter === 'feedback' },
              { id: 'providers', label: 'Providers', active: tabFilter === 'providers' },
            ]}
            onTabChange={handleTabChange}
            className={styles.lexiTabs}
          />
        }
        sidebar={
          <HubSidebar>
            <AdminStatsWidget
              title="Quick Stats"
              stats={summaryData ? [
                { label: 'Total Conversations', value: summaryData.totalConversations },
                { label: 'Total Messages', value: summaryData.totalMessages },
                { label: 'Unique Users', value: summaryData.uniqueUsers },
                { label: 'Avg Messages/Conv', value: summaryData.avgMessagesPerConversation },
                { label: 'Satisfaction Rate', value: `${feedbackRate}%`, valueColor: feedbackRate >= 80 ? 'green' : feedbackRate >= 50 ? 'orange' : 'default' },
              ] : [
                { label: 'Total Conversations', value: '...' },
                { label: 'Total Messages', value: '...' },
                { label: 'Unique Users', value: '...' },
                { label: 'Avg Messages/Conv', value: '...' },
                { label: 'Satisfaction Rate', value: '...' },
              ]}
            />
            <AdminHelpWidget
              title="About Lexi Analytics"
              items={[
                { question: 'What is Lexi?', answer: 'Lexi is TutorWise\'s AI assistant that helps users with tasks like booking lessons, viewing progress, and getting support.' },
                { question: 'What are personas?', answer: 'Personas determine how Lexi responds. Each user type (student, tutor, client, etc.) gets tailored assistance.' },
              ]}
            />
            <AdminTipWidget
              title="Analytics Tips"
              tips={[
                'Monitor feedback rates to identify areas for improvement',
                'Check intent distribution to understand user needs',
                'Compare provider performance for cost optimization',
                'Review conversations with negative feedback',
              ]}
            />
          </HubSidebar>
        }
      >
        <div className={styles.container}>
          {tabFilter === 'overview' && (
            <OverviewTab
              summaryData={summaryData}
              breakdownData={breakdownData}
              isLoading={summaryLoading || breakdownLoading}
            />
          )}
          {tabFilter === 'conversations' && (
            <ConversationsTab />
          )}
          {tabFilter === 'feedback' && (
            <FeedbackTab
              summaryData={summaryData}
              isLoading={summaryLoading}
            />
          )}
          {tabFilter === 'providers' && (
            <ProvidersTab
              breakdownData={breakdownData}
              isLoading={breakdownLoading}
            />
          )}
        </div>
      </HubPageLayout>
    </ErrorBoundary>
  );
}

// --- Tab Components ---

interface OverviewTabProps {
  summaryData: SummaryStats | undefined;
  breakdownData: BreakdownData | undefined;
  isLoading: boolean;
}

function OverviewTab({ summaryData, breakdownData, isLoading }: OverviewTabProps) {
  if (isLoading) {
    return <div className={styles.loading}>Loading analytics...</div>;
  }

  return (
    <div className={styles.overviewContent}>
      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <StatCard
          title="Total Conversations"
          value={summaryData?.totalConversations || 0}
          icon="💬"
        />
        <StatCard
          title="Total Messages"
          value={summaryData?.totalMessages || 0}
          icon="📝"
        />
        <StatCard
          title="Unique Users"
          value={summaryData?.uniqueUsers || 0}
          icon="👥"
        />
        <StatCard
          title="Avg Messages/Conversation"
          value={summaryData?.avgMessagesPerConversation || 0}
          icon="📊"
        />
      </div>

      {/* Persona Distribution */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Conversations by Persona</h3>
        <div className={styles.distributionGrid}>
          {breakdownData?.byPersona && Object.entries(breakdownData.byPersona).map(([persona, count]) => (
            <div key={persona} className={styles.distributionItem}>
              <span className={`${styles.personaBadge} ${styles[`persona${capitalize(persona)}`]}`}>
                {getPersonaLabel(persona)}
              </span>
              <span className={styles.distributionCount}>{count}</span>
            </div>
          ))}
          {(!breakdownData?.byPersona || Object.keys(breakdownData.byPersona).length === 0) && (
            <p className={styles.noData}>No conversation data yet</p>
          )}
        </div>
      </div>

      {/* Top Intents */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Top User Intents</h3>
        <div className={styles.intentList}>
          {summaryData?.topIntents.slice(0, 5).map(({ intent, count }) => (
            <div key={intent} className={styles.intentItem}>
              <span className={styles.intentName}>{formatIntent(intent)}</span>
              <span className={styles.intentCount}>{count}</span>
            </div>
          ))}
          {(!summaryData?.topIntents || summaryData.topIntents.length === 0) && (
            <p className={styles.noData}>No intent data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationsTab() {
  return (
    <HubEmptyState
      title="Conversation Browser"
      description="Browse and review individual conversations. Coming in next update."
    />
  );
}

interface FeedbackTabProps {
  summaryData: SummaryStats | undefined;
  isLoading: boolean;
}

function FeedbackTab({ summaryData, isLoading }: FeedbackTabProps) {
  if (isLoading) {
    return <div className={styles.loading}>Loading feedback data...</div>;
  }

  const total = (summaryData?.feedbackPositive || 0) + (summaryData?.feedbackNegative || 0);
  const positiveRate = total > 0 ? Math.round((summaryData?.feedbackPositive || 0) / total * 100) : 0;

  return (
    <div className={styles.feedbackContent}>
      <div className={styles.feedbackStats}>
        <div className={styles.feedbackCard}>
          <span className={styles.feedbackEmoji}>👍</span>
          <span className={styles.feedbackValue}>{summaryData?.feedbackPositive || 0}</span>
          <span className={styles.feedbackLabel}>Positive</span>
        </div>
        <div className={styles.feedbackCard}>
          <span className={styles.feedbackEmoji}>👎</span>
          <span className={styles.feedbackValue}>{summaryData?.feedbackNegative || 0}</span>
          <span className={styles.feedbackLabel}>Negative</span>
        </div>
        <div className={styles.feedbackCard}>
          <span className={styles.feedbackEmoji}>📈</span>
          <span className={styles.feedbackValue}>{positiveRate}%</span>
          <span className={styles.feedbackLabel}>Satisfaction Rate</span>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Recent Feedback</h3>
        <HubEmptyState
          title="Feedback Review"
          description="Detailed feedback review with comments coming soon."
        />
      </div>
    </div>
  );
}

interface ProvidersTabProps {
  breakdownData: BreakdownData | undefined;
  isLoading: boolean;
}

function ProvidersTab({ breakdownData, isLoading }: ProvidersTabProps) {
  const queryClient = useQueryClient();

  // Fetch provider configuration
  const { data: providerData, isLoading: providerLoading } = useQuery({
    queryKey: ['admin', 'lexi', 'providers'],
    queryFn: async () => {
      const response = await fetch('/api/lexi/provider');
      if (!response.ok) throw new Error('Failed to fetch providers');
      return response.json() as Promise<ProviderData>;
    },
    staleTime: 30 * 1000,
  });

  // Mutation to change provider
  const changeProviderMutation = useMutation({
    mutationFn: async (type: string) => {
      const response = await fetch('/api/lexi/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change provider');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'lexi', 'providers'] });
    },
  });

  if (isLoading || providerLoading) {
    return <div className={styles.loading}>Loading provider data...</div>;
  }

  const usageStats = breakdownData?.byProvider || {};
  const total = Object.values(usageStats).reduce((sum, count) => sum + count, 0);

  return (
    <div className={styles.providersContent}>
      {/* Active Provider Selection */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Active Provider</h3>
          {providerData && (
            <span className={styles.currentProviderBadge}>
              Currently: {providerData.currentName}
            </span>
          )}
        </div>
        <p className={styles.sectionDescription}>
          Select which AI provider Lexi should use for generating responses. Changes take effect immediately for new conversations.
        </p>

        <div className={styles.providerCards}>
          {providerData?.providers.map((provider) => (
            <button
              key={provider.type}
              className={`${styles.providerCard} ${provider.current ? styles.providerCardActive : ''} ${!provider.available ? styles.providerCardDisabled : ''}`}
              onClick={() => provider.available && !provider.current && changeProviderMutation.mutate(provider.type)}
              disabled={!provider.available || provider.current || changeProviderMutation.isPending}
            >
              <div className={styles.providerCardHeader}>
                <span className={`${styles.providerIcon} ${styles[`providerIcon${capitalize(provider.type)}`]}`}>
                  {getProviderIcon(provider.type)}
                </span>
                {provider.current && (
                  <span className={styles.activeBadge}>Active</span>
                )}
                {!provider.available && (
                  <span className={styles.unavailableBadge}>Unavailable</span>
                )}
              </div>
              <h4 className={styles.providerCardTitle}>{provider.name}</h4>
              <p className={styles.providerCardDescription}>{provider.description}</p>
              {!provider.available && provider.requiresApiKey && (
                <p className={styles.providerCardHint}>
                  Set {provider.envVar} to enable
                </p>
              )}
              {changeProviderMutation.isPending && changeProviderMutation.variables === provider.type && (
                <span className={styles.switchingIndicator}>Switching...</span>
              )}
            </button>
          ))}
        </div>

        {changeProviderMutation.isError && (
          <div className={styles.errorMessage}>
            {changeProviderMutation.error.message}
          </div>
        )}
      </div>

      {/* Usage Statistics */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Usage Statistics</h3>
        <div className={styles.providersList}>
          {Object.entries(usageStats).map(([provider, count]) => {
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={provider} className={styles.providerItem}>
                <div className={styles.providerInfo}>
                  <span className={styles.providerName}>{getProviderLabel(provider)}</span>
                  <span className={styles.providerCount}>{count} conversations</span>
                </div>
                <div className={styles.providerBar}>
                  <div
                    className={`${styles.providerBarFill} ${styles[`provider${capitalize(provider)}`]}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className={styles.providerPercentage}>{percentage}%</span>
              </div>
            );
          })}
          {Object.keys(usageStats).length === 0 && (
            <p className={styles.noData}>No usage data yet</p>
          )}
        </div>
      </div>

      {/* Provider Comparison */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Provider Comparison</h3>
        <div className={styles.comparisonTable}>
          <div className={styles.comparisonHeader}>
            <span>Feature</span>
            <span>Rules</span>
            <span>Claude</span>
            <span>Gemini</span>
          </div>
          <div className={styles.comparisonRow}>
            <span>API Cost</span>
            <span className={styles.featureGood}>Free</span>
            <span className={styles.featureNeutral}>Per token</span>
            <span className={styles.featureNeutral}>Per token</span>
          </div>
          <div className={styles.comparisonRow}>
            <span>Response Quality</span>
            <span className={styles.featureNeutral}>Basic</span>
            <span className={styles.featureGood}>Excellent</span>
            <span className={styles.featureGood}>Good</span>
          </div>
          <div className={styles.comparisonRow}>
            <span>Streaming</span>
            <span className={styles.featureBad}>No</span>
            <span className={styles.featureGood}>Yes</span>
            <span className={styles.featureGood}>Yes</span>
          </div>
          <div className={styles.comparisonRow}>
            <span>Offline Support</span>
            <span className={styles.featureGood}>Yes</span>
            <span className={styles.featureBad}>No</span>
            <span className={styles.featureBad}>No</span>
          </div>
          <div className={styles.comparisonRow}>
            <span>Best For</span>
            <span>Simple queries</span>
            <span>Complex tasks</span>
            <span>General use</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getProviderIcon(type: string): string {
  switch (type) {
    case 'rules': return '📋';
    case 'claude': return '🤖';
    case 'gemini': return '✨';
    default: return '⚙️';
  }
}

// --- Helper Components ---

interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statIcon}>{icon}</span>
      <div className={styles.statInfo}>
        <span className={styles.statValue}>{typeof value === 'number' ? value.toLocaleString() : value}</span>
        <span className={styles.statTitle}>{title}</span>
      </div>
    </div>
  );
}

// --- Helpers ---

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getPersonaLabel(persona: string): string {
  const labels: Record<string, string> = {
    student: 'Student',
    tutor: 'Tutor',
    client: 'Parent',
    agent: 'Agent',
    organisation: 'Organisation',
  };
  return labels[persona] || persona;
}

function getProviderLabel(provider: string): string {
  const labels: Record<string, string> = {
    rules: 'Rules-based',
    claude: 'Claude (Anthropic)',
    gemini: 'Gemini (Google)',
  };
  return labels[provider] || provider;
}

function formatIntent(intent: string): string {
  return intent
    .split(':')
    .map(part => capitalize(part.replace(/_/g, ' ')))
    .join(' → ');
}
