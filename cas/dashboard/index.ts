/**
 * CAS Dashboard
 *
 * Monitoring dashboard for Lexi, Sage, and CAS agents.
 * Provides read-only metrics and feedback analysis.
 *
 * @module cas/dashboard
 */

// Types
export type {
  AgentMetrics,
  LexiMetrics,
  SageMetrics,
  SystemMetrics,
  DashboardState,
  DashboardAlert,
  TimeRange,
  TimeRangeFilter,
  ChartDataPoint,
  ChartSeries,
  FeedbackSummary,
  DashboardReport,
} from './types';

// Metrics Collector
export { MetricsCollector, metricsCollector } from './metrics-collector';

// --- Quick Access Functions ---

import { metricsCollector } from './metrics-collector';
import type { DashboardState, TimeRange } from './types';

/**
 * Get full dashboard state
 */
export async function getDashboardState(range: TimeRange = 'day'): Promise<DashboardState> {
  const [agents, lexi, sage, system] = await Promise.all([
    metricsCollector.getAgentMetrics(),
    metricsCollector.getLexiMetrics(range),
    metricsCollector.getSageMetrics(range),
    metricsCollector.getSystemMetrics(),
  ]);

  return {
    agents,
    lexi,
    sage,
    system,
    alerts: [], // Would be populated from alert system
    lastUpdated: new Date(),
  };
}

/**
 * Get combined feedback summary for both Lexi and Sage
 */
export async function getCombinedFeedback(range: TimeRange = 'week') {
  const [lexiFeedback, sageFeedback] = await Promise.all([
    metricsCollector.getFeedbackSummary('lexi', range),
    metricsCollector.getFeedbackSummary('sage', range),
  ]);

  return {
    lexi: lexiFeedback,
    sage: sageFeedback,
    combined: {
      total: lexiFeedback.total + sageFeedback.total,
      positive: lexiFeedback.positive + sageFeedback.positive,
      negative: lexiFeedback.negative + sageFeedback.negative,
      positiveRate: Math.round(
        ((lexiFeedback.positive + sageFeedback.positive) /
          Math.max(1, lexiFeedback.total + sageFeedback.total)) *
          100
      ),
    },
  };
}

export default {
  getDashboardState,
  getCombinedFeedback,
  metricsCollector,
};
