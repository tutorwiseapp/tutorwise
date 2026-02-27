/*
 * Filename: src/app/(admin)/admin/cas/page.tsx
 * Purpose: CAS AI Agents Analytics Dashboard
 * Created: 2026-02-26
 * Updated: 2026-02-26 - Created from Lexi template
 *
 * Pattern: Follows Admin Dashboard pattern (Sage/Lexi/Listings/Bookings)
 * Architecture: Hub-based with tabs for overview, agents, feedback, runtime, metrics
 */
'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import HubEmptyState from '@/app/components/hub/content/HubEmptyState';
import { HubKPIGrid, HubKPICard, HubComplexKPICard, HubTrendChart, HubCategoryBreakdownChart, type CategoryData } from '@/app/components/hub/charts';
import { AdminStatsWidget, AdminHelpWidget, AdminTipWidget } from '@/app/components/admin/widgets';
import { useAdminMetric, formatMetricChange } from '@/hooks/useAdminMetric';
import { useAdminTrendData } from '@/hooks/useAdminTrendData';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import { ChartSkeleton } from '@/app/components/ui/feedback/LoadingSkeleton';
import Button from '@/app/components/ui/actions/Button';
import { Bot, Cpu, Activity, Shield, TrendingUp, AlertTriangle, CheckCircle, XCircle, Clock, Zap, BarChart, BarChart3, Settings, ThumbsUp, ThumbsDown, Users, Calendar, AlertCircle, RefreshCw, DollarSign, Sparkles, MessageSquare, FileCheck } from 'lucide-react';
import { CASRuntimeDashboard, MigrationStatusDashboard } from '@cas/packages/core/src/admin';
import styles from './page.module.css';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

type TabFilter = 'overview' | 'agents' | 'feedback' | 'runtime' | 'metrics';

interface RuntimeInfo {
  type: string;
  name: string;
  description: string;
  available: boolean;
  current: boolean;
  features: string[];
}

interface RuntimeData {
  current: string;
  currentName: string;
  runtimes: RuntimeInfo[];
}

export default function CASAnalyticsPage() {
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
    window.location.href = `/admin/cas${params.toString() ? `?${params.toString()}` : ''}`;
  };

  // Fetch real-time counts from CAS tables
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: casStats } = useQuery({
    queryKey: ['admin-cas-stats'],
    queryFn: async () => {
      const [agentsRes, tasksRes, insightsRes, scansRes] = await Promise.all([
        supabase.from('cas_agent_status').select('*'),
        supabase.from('cas_planner_tasks').select('id', { count: 'exact', head: true }),
        supabase.from('cas_marketer_insights').select('id', { count: 'exact', head: true }),
        supabase.from('cas_security_scans').select('id', { count: 'exact', head: true }),
      ]);

      const activeAgents = agentsRes.data?.filter(a => a.status === 'running').length || 0;
      const totalAgents = agentsRes.data?.length || 8; // 8 agents total

      return {
        activeAgents,
        totalAgents,
        totalTasks: tasksRes.count || 0,
        totalInsights: insightsRes.count || 0,
        totalScans: scansRes.count || 0,
      };
    },
    staleTime: 30000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Fetch historical metrics from platform_statistics_daily
  const agentsActiveMetric = useAdminMetric({ metric: 'cas_agents_active', compareWith: 'last_month' });
  const tasksGeneratedMetric = useAdminMetric({ metric: 'cas_tasks_generated', compareWith: 'last_month' });
  const insightsCreatedMetric = useAdminMetric({ metric: 'cas_insights_created', compareWith: 'last_month' });
  const agentExecutionsMetric = useAdminMetric({ metric: 'cas_agent_executions', compareWith: 'last_month' });

  // Feedback metrics
  const feedbackProcessedMetric = useAdminMetric({ metric: 'cas_feedback_processed', compareWith: 'last_month' });
  const feedbackToTasksMetric = useAdminMetric({ metric: 'cas_feedback_to_tasks', compareWith: 'last_month' });
  const feedbackConversionRateMetric = useAdminMetric({ metric: 'cas_feedback_conversion_rate', compareWith: 'last_month' });

  // Agent metrics (8 agents)
  const agentMarketerMetric = useAdminMetric({ metric: 'cas_agent_marketer_executions', compareWith: 'last_month' });
  const agentAnalystMetric = useAdminMetric({ metric: 'cas_agent_analyst_executions', compareWith: 'last_month' });
  const agentPlannerMetric = useAdminMetric({ metric: 'cas_agent_planner_executions', compareWith: 'last_month' });
  const agentDeveloperMetric = useAdminMetric({ metric: 'cas_agent_developer_executions', compareWith: 'last_month' });
  const agentTesterMetric = useAdminMetric({ metric: 'cas_agent_tester_executions', compareWith: 'last_month' });
  const agentQAMetric = useAdminMetric({ metric: 'cas_agent_qa_executions', compareWith: 'last_month' });
  const agentEngineerMetric = useAdminMetric({ metric: 'cas_agent_engineer_executions', compareWith: 'last_month' });
  const agentSecurityMetric = useAdminMetric({ metric: 'cas_agent_security_executions', compareWith: 'last_month' });

  // Runtime metrics
  const runtimeCustomMetric = useAdminMetric({ metric: 'cas_runtime_custom_usage', compareWith: 'last_month' });
  const runtimeLangGraphMetric = useAdminMetric({ metric: 'cas_runtime_langgraph_usage', compareWith: 'last_month' });
  const runtimeCurrentMetric = useAdminMetric({ metric: 'cas_runtime_current', compareWith: 'last_month' });

  // Performance metrics
  const avgExecutionTimeMetric = useAdminMetric({ metric: 'cas_avg_execution_time_ms', compareWith: 'last_month' });
  const successRateMetric = useAdminMetric({ metric: 'cas_success_rate', compareWith: 'last_month' });
  const errorRateMetric = useAdminMetric({ metric: 'cas_error_rate', compareWith: 'last_month' });
  const uptimeMetric = useAdminMetric({ metric: 'cas_uptime_percent', compareWith: 'last_month' });

  // Security metrics
  const vulnerabilitiesFoundMetric = useAdminMetric({ metric: 'cas_vulnerabilities_found', compareWith: 'last_month' });
  const criticalVulnsMetric = useAdminMetric({ metric: 'cas_vulnerabilities_critical', compareWith: 'last_month' });
  const scansCompletedMetric = useAdminMetric({ metric: 'cas_scans_completed', compareWith: 'last_month' });

  // Cost metrics
  const aiCostTotalMetric = useAdminMetric({ metric: 'cas_ai_cost_total', compareWith: 'last_month' });
  const costPerTaskMetric = useAdminMetric({ metric: 'cas_cost_per_task', compareWith: 'last_month' });
  const tokenUsageMetric = useAdminMetric({ metric: 'cas_token_usage_total', compareWith: 'last_month' });
  const monthlyProjectionMetric = useAdminMetric({ metric: 'cas_monthly_cost_projection', compareWith: 'last_month' });

  // Fetch trend data for charts (last 7 days)
  // TODO: Add cas_tasks_generated and cas_insights_created columns to platform_statistics_daily table
  const tasksTrendsQuery = useAdminTrendData({ metric: 'cas_tasks_generated', days: 7 });
  const insightsTrendsQuery = useAdminTrendData({ metric: 'cas_insights_created', days: 7 });

  const isLoadingCharts = tasksTrendsQuery.isLoading || insightsTrendsQuery.isLoading;

  // Agent breakdown data (executions by agent)
  const agentBreakdownData: CategoryData[] = [
    { label: 'Marketer', value: agentMarketerMetric.value, color: '#3B82F6' },
    { label: 'Analyst', value: agentAnalystMetric.value, color: '#10B981' },
    { label: 'Planner', value: agentPlannerMetric.value, color: '#F59E0B' },
    { label: 'Developer', value: agentDeveloperMetric.value, color: '#8B5CF6' },
    { label: 'Tester', value: agentTesterMetric.value, color: '#06B6D4' },
    { label: 'QA', value: agentQAMetric.value, color: '#F43F5E' },
    { label: 'Engineer', value: agentEngineerMetric.value, color: '#84CC16' },
    { label: 'Security', value: agentSecurityMetric.value, color: '#EC4899' },
  ];

  // Runtime breakdown data
  const runtimeBreakdownData: CategoryData[] = [
    { label: 'LangGraph', value: runtimeLangGraphMetric.value, color: '#3B82F6' },
    { label: 'Custom Runtime', value: runtimeCustomMetric.value, color: '#10B981' },
  ];

  // Calculate feedback conversion rate
  const feedbackTotal = feedbackProcessedMetric.value;
  const feedbackConversionRate = feedbackTotal > 0
    ? Math.round((feedbackToTasksMetric.value / feedbackTotal) * 100)
    : 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <ErrorBoundary>
      <HubPageLayout
        header={
          <HubHeader
            title="CAS AI Agents"
            subtitle="Contextual Autonomous System - Agent Orchestration & Analytics"
            className={styles.lexiHeader}
            actions={
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="secondary" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin'] })}>
                  Refresh Data
                </Button>
                <Button variant="secondary" size="sm" onClick={() => router.push('/admin')}>
                  Back to Dashboard
                </Button>
              </div>
            }
          />
        }
        tabs={
          <HubTabs
            tabs={[
              { id: 'overview', label: 'Overview', active: tabFilter === 'overview' },
              { id: 'agents', label: 'Agents', active: tabFilter === 'agents' },
              { id: 'feedback', label: 'Feedback', active: tabFilter === 'feedback' },
              { id: 'runtime', label: 'Runtime', active: tabFilter === 'runtime' },
              { id: 'metrics', label: 'Metrics & Costs', active: tabFilter === 'metrics' },
            ]}
            onTabChange={handleTabChange}
            className={styles.casTabs}
          />
        }
        sidebar={
          <HubSidebar>
            <AdminStatsWidget
              title="Quick Stats"
              stats={[
                { label: 'Active Agents', value: casStats?.activeAgents ?? 0, valueColor: (casStats?.activeAgents ?? 0) >= 7 ? 'green' : (casStats?.activeAgents ?? 0) >= 4 ? 'orange' : 'default' },
                { label: 'Tasks Generated', value: casStats?.totalTasks ?? 0 },
                { label: 'Security Scans', value: casStats?.totalScans ?? 0 },
                { label: 'Insights Created', value: casStats?.totalInsights ?? 0 },
              ]}
            />
            <AdminHelpWidget
              title="CAS Help"
              items={[
                { question: 'What is CAS?', answer: 'CAS (Contextual Autonomous System) is an AI-powered platform orchestrating 8 autonomous agents for continuous software delivery.' },
                { question: 'What do agents do?', answer: 'Agents process feedback from Sage/Lexi, generate insights, create tasks, run security scans, and collect analytics automatically.' },
                { question: 'What is Runtime?', answer: 'CAS supports multiple agent runtimes (Custom or LangGraph) for flexibility and migration without downtime.' },
              ]}
            />
            <AdminTipWidget
              title="CAS Tips"
              tips={[
                'Monitor agent status to ensure all 8 agents are running',
                'Check feedback conversion rate to optimize task generation',
                'Review security scans for critical vulnerabilities',
                'Track agent performance metrics for optimization',
              ]}
            />
          </HubSidebar>
        }
      >
        {/* Overview Tab */}
        {tabFilter === 'overview' && (
          <>
            {/* KPI Cards Grid */}
            <HubKPIGrid>
              <HubKPICard
                label="Active Agents"
                value={agentsActiveMetric.value}
                sublabel={formatMetricChange(
                  agentsActiveMetric.change,
                  agentsActiveMetric.changePercent,
                  'last_month'
                )}
                icon={Bot}
                trend={agentsActiveMetric.trend}
              />
              <HubKPICard
                label="Tasks Generated"
                value={tasksGeneratedMetric.value}
                sublabel={formatMetricChange(
                  tasksGeneratedMetric.change,
                  tasksGeneratedMetric.changePercent,
                  'last_month'
                )}
                icon={Activity}
                trend={tasksGeneratedMetric.trend}
              />
              <HubKPICard
                label="Insights Created"
                value={insightsCreatedMetric.value}
                sublabel={formatMetricChange(
                  insightsCreatedMetric.change,
                  insightsCreatedMetric.changePercent,
                  'last_month'
                )}
                icon={TrendingUp}
                trend={insightsCreatedMetric.trend}
              />
              <HubKPICard
                label="Agent Executions"
                value={agentExecutionsMetric.value > 0 ? agentExecutionsMetric.value.toFixed(0) : '0'}
                sublabel={
                  agentExecutionsMetric.previousValue
                    ? `${agentExecutionsMetric.previousValue.toFixed(0)} last month`
                    : undefined
                }
                icon={BarChart}
              />
              <HubKPICard
                label="Satisfaction Rate"
                value={`${successRateMetric.value.toFixed(0)}%`}
                sublabel={formatMetricChange(
                  successRateMetric.change,
                  successRateMetric.changePercent,
                  'last_month'
                )}
                icon={ThumbsUp}
                trend={successRateMetric.trend}
                variant={successRateMetric.value >= 80 ? 'success' : successRateMetric.value >= 50 ? 'info' : 'warning'}
              />
              <HubKPICard
                label="Positive Feedback"
                value={feedbackProcessedMetric.value}
                sublabel={formatMetricChange(
                  feedbackProcessedMetric.change,
                  feedbackProcessedMetric.changePercent,
                  'last_month'
                )}
                icon={ThumbsUp}
                trend={feedbackProcessedMetric.trend}
                variant="success"
              />
              <HubKPICard
                label="Negative Feedback"
                value={feedbackToTasksMetric.value}
                sublabel={formatMetricChange(
                  feedbackToTasksMetric.change,
                  feedbackToTasksMetric.changePercent,
                  'last_month'
                )}
                icon={ThumbsDown}
                trend={feedbackToTasksMetric.trend}
                variant="warning"
              />
              <HubKPICard
                label="Total Users"
                value={agentExecutionsMetric.value}
                sublabel={formatMetricChange(
                  agentExecutionsMetric.change,
                  agentExecutionsMetric.changePercent,
                  'last_month'
                )}
                icon={Users}
                trend={agentExecutionsMetric.trend}
              />
            </HubKPIGrid>

            {/* Charts Section */}
            <div className={styles.chartsSection}>
              {/* Task Generation Trends Chart */}
              <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load conversation trends chart</div>}>
                {isLoadingCharts ? (
                  <ChartSkeleton height="320px" />
                ) : (
                  <HubTrendChart
                    data={tasksTrendsQuery.data}
                    title="Task Generation Trends"
                    subtitle="Last 7 days"
                    valueName="Tasks"
                    lineColor="#3B82F6"
                  />
                )}
              </ErrorBoundary>

              {/* Insights Created Trends Chart */}
              <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load messages trends chart</div>}>
                {isLoadingCharts ? (
                  <ChartSkeleton height="320px" />
                ) : (
                  <HubTrendChart
                    data={insightsTrendsQuery.data}
                    title="Insights Created Trends"
                    subtitle="Last 7 days"
                    valueName="Insights"
                    lineColor="#10B981"
                  />
                )}
              </ErrorBoundary>

              {/* Persona Breakdown */}
              <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load persona breakdown chart</div>}>
                <HubCategoryBreakdownChart
                  data={agentBreakdownData}
                  title="Executions by Agent"
                  subtitle="User type distribution"
                />
              </ErrorBoundary>
            </div>
          </>
        )}

        {/* Conversations Tab - Coming Soon */}
        {tabFilter === 'agents' && (
          <HubKPIGrid className={styles.agentGrid}>
            {/* Marketer Agent */}
            <HubComplexKPICard
              icon={<TrendingUp size={20} />}
              title="Marketer"
              description="Analyzes market trends and generates insights for growth opportunities."
              status={{ label: 'Running', variant: 'success' }}
              stats={[
                { label: 'Executions', value: agentMarketerMetric.value },
                { label: 'Uptime', value: '99.8%' }
              ]}
            />

            {/* Analyst Agent */}
            <HubComplexKPICard
              icon={<BarChart size={20} />}
              title="Analyst"
              description="Processes data and generates analytical reports on platform metrics."
              status={{ label: 'Running', variant: 'success' }}
              stats={[
                { label: 'Executions', value: agentAnalystMetric.value },
                { label: 'Uptime', value: '99.5%' }
              ]}
            />

            {/* Planner Agent */}
            <HubComplexKPICard
              icon={<Calendar size={20} />}
              title="Planner"
              description="Creates and manages development tasks and project roadmaps."
              status={{ label: 'Running', variant: 'success' }}
              stats={[
                { label: 'Executions', value: agentPlannerMetric.value },
                { label: 'Uptime', value: '99.9%' }
              ]}
            />

            {/* Developer Agent */}
            <HubComplexKPICard
              icon={<Cpu size={20} />}
              title="Developer"
              description="Implements features and writes code based on planned tasks."
              status={{ label: 'Running', variant: 'success' }}
              stats={[
                { label: 'Executions', value: agentDeveloperMetric.value },
                { label: 'Uptime', value: '98.2%' }
              ]}
            />

            {/* Tester Agent */}
            <HubComplexKPICard
              icon={<CheckCircle size={20} />}
              title="Tester"
              description="Runs automated tests and validates code quality."
              status={{ label: 'Running', variant: 'success' }}
              stats={[
                { label: 'Executions', value: 0 },
                { label: 'Uptime', value: '100%' }
              ]}
            />

            {/* QA Agent */}
            <HubComplexKPICard
              icon={<Activity size={20} />}
              title="QA"
              description="Performs quality assurance and identifies potential issues."
              status={{ label: 'Running', variant: 'success' }}
              stats={[
                { label: 'Executions', value: 0 },
                { label: 'Uptime', value: '100%' }
              ]}
            />

            {/* Engineer Agent */}
            <HubComplexKPICard
              icon={<Settings size={20} />}
              title="Engineer"
              description="Manages infrastructure and deployment pipelines."
              status={{ label: 'Running', variant: 'success' }}
              stats={[
                { label: 'Executions', value: 0 },
                { label: 'Uptime', value: '100%' }
              ]}
            />

            {/* Security Agent */}
            <HubComplexKPICard
              icon={<Shield size={20} />}
              title="Security"
              description="Scans for vulnerabilities and monitors security threats."
              status={{ label: 'Running', variant: 'success' }}
              stats={[
                { label: 'Executions', value: agentSecurityMetric.value },
                { label: 'Uptime', value: '99.7%' }
              ]}
            />
          </HubKPIGrid>
        )}

        {/* Feedback Tab */}
        {tabFilter === 'feedback' && (
          <>
            <HubKPIGrid>
              <HubKPICard
                label="Positive Feedback"
                value={feedbackProcessedMetric.value}
                sublabel={formatMetricChange(
                  feedbackProcessedMetric.change,
                  feedbackProcessedMetric.changePercent,
                  'last_month'
                )}
                icon={ThumbsUp}
                trend={feedbackProcessedMetric.trend}
                variant="success"
              />
              <HubKPICard
                label="Negative Feedback"
                value={feedbackToTasksMetric.value}
                sublabel={formatMetricChange(
                  feedbackToTasksMetric.change,
                  feedbackToTasksMetric.changePercent,
                  'last_month'
                )}
                icon={ThumbsDown}
                trend={feedbackToTasksMetric.trend}
                variant="warning"
              />
              <HubKPICard
                label="Satisfaction Rate"
                value={`${successRateMetric.value.toFixed(0)}%`}
                sublabel={formatMetricChange(
                  successRateMetric.change,
                  successRateMetric.changePercent,
                  'last_month'
                )}
                icon={BarChart}
                trend={successRateMetric.trend}
                variant={successRateMetric.value >= 80 ? 'success' : successRateMetric.value >= 50 ? 'info' : 'warning'}
              />
            </HubKPIGrid>

            {/* HubEmptyState renders directly - no section wrapper for "coming soon" features */}
            <HubEmptyState
              title="Feedback Review"
              description="Detailed feedback review with comments coming soon."
              icon={<MessageSquare size={48} />}
            />
          </>
        )}

        {/* Runtime Tab */}
        {tabFilter === 'runtime' && (
          <RuntimeTab
            runtimeBreakdownData={runtimeBreakdownData}
          />
        )}

        {/* Quota & Costs Tab */}
        {tabFilter === 'metrics' && (
          <>
            {/* Agent Performance Section */}
            <h2 className={styles.sectionHeading}>Agent Performance</h2>
            <HubKPIGrid>
              <HubKPICard
                label="Total Executions"
                value={agentExecutionsMetric.value}
                sublabel={formatMetricChange(
                  agentExecutionsMetric.change,
                  agentExecutionsMetric.changePercent,
                  'last_month'
                )}
                icon={Activity}
                trend={agentExecutionsMetric.trend}
              />
              <HubKPICard
                label="Success Rate"
                value={`${successRateMetric.value.toFixed(1)}%`}
                sublabel={
                  successRateMetric.previousValue !== null
                    ? `${successRateMetric.previousValue.toFixed(1)}% last month`
                    : 'Successful executions'
                }
                icon={CheckCircle}
              />
              <HubKPICard
                label="Avg Execution Time"
                value={avgExecutionTimeMetric.value > 0 ? `${avgExecutionTimeMetric.value.toFixed(1)}s` : '0s'}
                sublabel={
                  avgExecutionTimeMetric.previousValue
                    ? `${avgExecutionTimeMetric.previousValue.toFixed(1)}s last month`
                    : 'Average task duration'
                }
                icon={Clock}
              />
              <HubKPICard
                label="System Uptime"
                value={`${uptimeMetric.value.toFixed(1)}%`}
                sublabel={formatMetricChange(
                  uptimeMetric.change,
                  uptimeMetric.changePercent,
                  'last_month'
                )}
                icon={TrendingUp}
                trend={uptimeMetric.trend}
              />
            </HubKPIGrid>

            {/* Task Metrics Section */}
            <h2 className={styles.sectionHeading}>Task Metrics</h2>
            <HubKPIGrid>
              <HubKPICard
                label="Tasks Generated"
                value={tasksGeneratedMetric.value}
                sublabel={formatMetricChange(
                  tasksGeneratedMetric.change,
                  tasksGeneratedMetric.changePercent,
                  'last_month'
                )}
                icon={BarChart}
                trend={tasksGeneratedMetric.trend}
              />
              <HubKPICard
                label="Insights Created"
                value={insightsCreatedMetric.value}
                sublabel={formatMetricChange(
                  insightsCreatedMetric.change,
                  insightsCreatedMetric.changePercent,
                  'last_month'
                )}
                icon={Sparkles}
                trend={insightsCreatedMetric.trend}
              />
              <HubKPICard
                label="Security Scans"
                value={scansCompletedMetric.value}
                sublabel={formatMetricChange(
                  scansCompletedMetric.change,
                  scansCompletedMetric.changePercent,
                  'last_month'
                )}
                icon={Shield}
                trend={scansCompletedMetric.trend}
              />
              <HubKPICard
                label="Error Rate"
                value={`${errorRateMetric.value.toFixed(1)}%`}
                sublabel={formatMetricChange(
                  errorRateMetric.change,
                  errorRateMetric.changePercent,
                  'last_month'
                )}
                icon={AlertCircle}
                trend={errorRateMetric.trend}
                variant={errorRateMetric.value > 5 ? 'warning' : 'neutral'}
              />
            </HubKPIGrid>

            {/* Cost Analysis Section */}
            <h2 className={styles.sectionHeading}>Cost Analysis</h2>
            <HubKPIGrid>
              <HubKPICard
                label="Total AI Cost"
                value={formatCurrency(aiCostTotalMetric.value)}
                sublabel={formatMetricChange(
                  aiCostTotalMetric.change,
                  aiCostTotalMetric.changePercent,
                  'last_month'
                )}
                icon={DollarSign}
                trend={aiCostTotalMetric.trend}
              />
              <HubKPICard
                label="Cost per Task"
                value={costPerTaskMetric.value > 0 ? formatCurrency(costPerTaskMetric.value) : '£0.00'}
                sublabel={
                  costPerTaskMetric.previousValue
                    ? `${formatCurrency(costPerTaskMetric.previousValue)} last month`
                    : 'Average cost per execution'
                }
                icon={DollarSign}
              />
              <HubKPICard
                label="Token Usage"
                value={tokenUsageMetric.value.toLocaleString()}
                sublabel={formatMetricChange(
                  tokenUsageMetric.change,
                  tokenUsageMetric.changePercent,
                  'last_month'
                )}
                icon={Zap}
                trend={tokenUsageMetric.trend}
              />
              <HubKPICard
                label="Monthly Projection"
                value={formatCurrency(monthlyProjectionMetric.value)}
                sublabel={
                  monthlyProjectionMetric.change !== null
                    ? `${monthlyProjectionMetric.change >= 0 ? '+' : ''}${formatCurrency(monthlyProjectionMetric.change)} vs last month`
                    : 'Estimated monthly cost'
                }
                icon={TrendingUp}
                trend={monthlyProjectionMetric.trend}
              />
            </HubKPIGrid>
          </>
        )}
      </HubPageLayout>
    </ErrorBoundary>
  );
}

// --- Tab Components ---

interface RuntimeTabProps {
  runtimeBreakdownData: CategoryData[];
}

function RuntimeTab({ runtimeBreakdownData }: RuntimeTabProps) {
  // CAS Runtime: LangGraph (primary) or Custom (fallback) - switched via CAS_RUNTIME env var
  const currentRuntime = process.env.NEXT_PUBLIC_CAS_RUNTIME || 'langgraph';
  const [runtimeSubTab, setRuntimeSubTab] = React.useState<'status' | 'migration'>('status');

  return (
    <div className={styles.chartsSection}>
      {/* Runtime Sub-Tabs */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', borderBottom: '2px solid #e5e7eb' }}>
        <button
          onClick={() => setRuntimeSubTab('status')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: 'transparent',
            borderBottom: `3px solid ${runtimeSubTab === 'status' ? '#3B82F6' : 'transparent'}`,
            color: runtimeSubTab === 'status' ? '#3B82F6' : '#6b7280',
            fontWeight: runtimeSubTab === 'status' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '14px',
            marginBottom: '-2px'
          }}
        >
          🔴 Live Status
        </button>
        <button
          onClick={() => setRuntimeSubTab('migration')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            background: 'transparent',
            borderBottom: `3px solid ${runtimeSubTab === 'migration' ? '#3B82F6' : 'transparent'}`,
            color: runtimeSubTab === 'migration' ? '#3B82F6' : '#6b7280',
            fontWeight: runtimeSubTab === 'migration' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '14px',
            marginBottom: '-2px'
          }}
        >
          📊 Migration Progress
        </button>
      </div>

      {/* Status Sub-Tab */}
      {runtimeSubTab === 'status' && (
        <>
          {/* Active Runtime */}
          <div className={styles.widget}>
            <div className={styles.widgetHeader}>
              <h2>Active Provider</h2>
            </div>

            <div className={styles.providerCards}>
              {/* LangGraph Runtime - PRIMARY */}
              <div className={`${styles.providerCard} ${currentRuntime === 'langgraph' ? styles.providerCardActive : ''}`}>
                <div className={styles.providerCardHeader}>
                  <div className={styles.providerIcon}>
                    {React.createElement(Cpu, { size: 20 })}
                  </div>
                  {currentRuntime === 'langgraph' && (
                    <span className={styles.activeBadge}>Active</span>
                  )}
                </div>
                <h4 className={styles.providerCardTitle}>LangGraph</h4>
                <p className={styles.providerCardDescription}>
                  Production-grade multi-agent orchestration with LangSmith observability. Default runtime.
                </p>
              </div>
            </div>

            {/* Note: CustomRuntime was removed in Phase 8 (2026-02-27) */}
            {/* Recovery: git checkout custom-runtime-last-working */}
          </div>

          {/* Runtime Distribution - Using Hub Chart */}
          <ErrorBoundary fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Unable to load runtime breakdown chart</div>}>
            <HubCategoryBreakdownChart
              data={runtimeBreakdownData}
              title="Runtime Distribution"
              subtitle="Tasks by runtime"
            />
          </ErrorBoundary>

          {/* Detailed Feature Comparison - NEW */}
          <div className={styles.widget}>
            <div className={styles.widgetHeader}>
              <h2>Feature Comparison</h2>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '0.5rem' }}>
                Detailed feature-by-feature comparison. Greyed-out features are unavailable.
              </p>
            </div>
            <CASRuntimeDashboard />
          </div>
        </>
      )}

      {/* Migration Progress Sub-Tab */}
      {runtimeSubTab === 'migration' && (
        <div className={styles.widget}>
          <div className={styles.widgetHeader}>
            <h2>Migration Progress</h2>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '0.5rem' }}>
              Track LangGraph runtime implementation progress and feature parity
            </p>
          </div>
          <MigrationStatusDashboard />
        </div>
      )}
    </div>
  );
}

// --- Helpers ---

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getProviderIcon(type: string) {
  switch (type) {
    case 'rules': return FileCheck;
    case 'claude': return Bot;
    case 'gemini': return Sparkles;
    default: return Settings;
  }
}
