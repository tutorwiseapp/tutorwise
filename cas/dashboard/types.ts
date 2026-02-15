/**
 * CAS Dashboard Types
 *
 * Type definitions for the CAS monitoring dashboard.
 *
 * @module cas/dashboard/types
 */

// --- Metrics Types ---

export interface AgentMetrics {
  agentType: string;
  status: 'active' | 'idle' | 'error';
  lastActivity: Date;
  taskCount: number;
  errorCount: number;
  avgResponseTime?: number;
}

export interface LexiMetrics {
  totalSessions: number;
  activeSessions: number;
  messageCount: number;
  avgSessionDuration: number;
  feedbackPositive: number;
  feedbackNegative: number;
  byPersona: Record<string, number>;
}

export interface SageMetrics {
  totalSessions: number;
  activeSessions: number;
  messageCount: number;
  avgSessionDuration: number;
  feedbackPositive: number;
  feedbackNegative: number;
  byRole: Record<string, number>;
  bySubject: Record<string, number>;
}

export interface SystemMetrics {
  timestamp: Date;
  cpuUsage?: number;
  memoryUsage?: number;
  apiLatency: number;
  errorRate: number;
  activeUsers: number;
}

// --- Dashboard State ---

export interface DashboardState {
  agents: AgentMetrics[];
  lexi: LexiMetrics;
  sage: SageMetrics;
  system: SystemMetrics;
  alerts: DashboardAlert[];
  lastUpdated: Date;
}

export interface DashboardAlert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

// --- Time Range ---

export type TimeRange = 'hour' | 'day' | 'week' | 'month';

export interface TimeRangeFilter {
  range: TimeRange;
  start: Date;
  end: Date;
}

// --- Chart Data ---

export interface ChartDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
}

// --- Feedback Analysis ---

export interface FeedbackSummary {
  agent: 'lexi' | 'sage';
  period: TimeRange;
  total: number;
  positive: number;
  negative: number;
  positiveRate: number;
  trend: 'improving' | 'declining' | 'stable';
  topIssues: string[];
  byRole: Record<string, { positive: number; negative: number }>;
}

// --- Report Types ---

export interface DashboardReport {
  type: 'daily' | 'weekly' | 'monthly';
  generatedAt: Date;
  metrics: {
    lexi: LexiMetrics;
    sage: SageMetrics;
    system: SystemMetrics;
  };
  highlights: string[];
  recommendations: string[];
}
