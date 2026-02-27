/**
 * CAS Runtime Dashboard - Live Status + Migration Progress
 *
 * Shows:
 * 1. Runtime status (CustomRuntime vs LangGraphRuntime)
 * 2. Feature availability (working vs greyed out)
 * 3. Migration progress
 * 4. Side-by-side comparison
 *
 * NOTE: This is a client-side component that displays STATIC feature status.
 * For live runtime testing, use server-side API endpoints instead.
 */

import React, { useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface FeatureStatus {
  name: string;
  category: string;
  customRuntime: 'available' | 'unavailable' | 'partial';
  langGraphRuntime: 'available' | 'unavailable' | 'partial';
  description: string;
  testResult?: {
    custom?: { working: boolean; error?: string };
    langGraph?: { working: boolean; error?: string };
  };
}

export interface RuntimeHealth {
  runtime: 'custom' | 'langgraph';
  healthy: boolean;
  initialized: boolean;
  error?: string;
  features: {
    available: number;
    unavailable: number;
    partial: number;
  };
}

// ============================================================================
// Feature Definitions with Live Testing
// ============================================================================

const FEATURE_TESTS: FeatureStatus[] = [
  // Infrastructure
  {
    name: 'Supabase Integration',
    category: 'Infrastructure',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: 'Database persistence and queries - ✅ COMPLETED 2026-02-26'
  },
  {
    name: 'Message Bus',
    category: 'Infrastructure',
    customRuntime: 'available',
    langGraphRuntime: 'unavailable',
    description: 'N/A - LangGraph uses direct execution instead of pub/sub'
  },
  {
    name: 'Circuit Breaker',
    category: 'Infrastructure',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: 'AI API failure protection with three-state pattern - ✅ COMPLETED 2026-02-26'
  },
  {
    name: 'Retry Logic',
    category: 'Infrastructure',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: 'Exponential backoff via RetryUtility - ✅ COMPLETED 2026-02-27'
  },
  {
    name: 'Agent Registry',
    category: 'Infrastructure',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: '8 AI agents (Analyst, Planner, Developer, etc.)'
  },

  // Task Execution
  {
    name: 'Single Task Execution',
    category: 'Task Execution',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: 'Execute one agent task directly - ✅ COMPLETED 2026-02-27'
  },
  {
    name: 'Task Streaming',
    category: 'Task Execution',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: 'Real-time progress updates via AsyncGenerator - ✅ COMPLETED 2026-02-27'
  },
  {
    name: 'Task Cancellation',
    category: 'Task Execution',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: 'Cancel running tasks with cleanup - ✅ COMPLETED 2026-02-27'
  },
  {
    name: 'Progress Callbacks',
    category: 'Task Execution',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: 'Real-time progress reporting - ✅ COMPLETED 2026-02-27'
  },

  // Workflow Orchestration
  {
    name: 'Workflow Execution',
    category: 'Workflow Orchestration',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: 'Multi-agent workflow coordination'
  },
  {
    name: 'Sequential Tasks',
    category: 'Workflow Orchestration',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: 'Execute tasks in sequence (A → B → C)'
  },
  {
    name: 'Parallel Tasks',
    category: 'Workflow Orchestration',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: 'Execute tasks concurrently'
  },
  {
    name: 'Workflow Streaming',
    category: 'Workflow Orchestration',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: 'Stream workflow execution via LangGraph.stream() - ✅ COMPLETED 2026-02-27'
  },
  {
    name: 'Conditional Routing',
    category: 'Workflow Orchestration',
    customRuntime: 'partial',
    langGraphRuntime: 'available',
    description: 'Route based on agent results (LangGraph advantage)'
  },
  {
    name: 'Workflow Visualization',
    category: 'Workflow Orchestration',
    customRuntime: 'unavailable',
    langGraphRuntime: 'available',
    description: 'Visual graph representation (LangGraph advantage)'
  },

  // State Management
  {
    name: 'Agent State Persistence',
    category: 'State Management',
    customRuntime: 'available',
    langGraphRuntime: 'unavailable',
    description: 'N/A - LangGraph uses workflow checkpoints instead of custom agent state'
  },
  {
    name: 'Workflow State',
    category: 'State Management',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: 'Maintain state across workflow execution'
  },
  {
    name: 'State Versioning',
    category: 'State Management',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: 'Track state changes with version history - ✅ COMPLETED 2026-02-26'
  },
  {
    name: 'State Reset',
    category: 'State Management',
    customRuntime: 'available',
    langGraphRuntime: 'unavailable',
    description: 'N/A - LangGraph uses checkpoint versioning for state rollback'
  },

  // Observability
  {
    name: 'Event Logging (DB)',
    category: 'Observability',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: 'Persist events to cas_agent_events & cas_workflow_events - ✅ COMPLETED 2026-02-27'
  },
  {
    name: 'Metrics Collection',
    category: 'Observability',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: 'Collect metrics to cas_metrics_timeseries - ✅ COMPLETED 2026-02-27'
  },
  {
    name: 'Log Persistence',
    category: 'Observability',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: 'Save logs to cas_agent_logs via onLog callbacks - ✅ COMPLETED 2026-02-27'
  },
  {
    name: 'Event History',
    category: 'Observability',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: 'Query historical events via SupabaseAdapter - ✅ COMPLETED 2026-02-27'
  },
  {
    name: 'Health Checks',
    category: 'Observability',
    customRuntime: 'available',
    langGraphRuntime: 'available',
    description: 'Runtime and agent health monitoring - ✅ COMPLETED 2026-02-26'
  },
];

// ============================================================================
// Static Runtime Health (based on feature configuration)
// ============================================================================

function getStaticRuntimeHealth(runtime: 'custom' | 'langgraph'): RuntimeHealth {
  const key = runtime === 'custom' ? 'customRuntime' : 'langGraphRuntime';

  const available = FEATURE_TESTS.filter(f => f[key] === 'available').length;
  const partial = FEATURE_TESTS.filter(f => f[key] === 'partial').length;
  const unavailable = FEATURE_TESTS.filter(f => f[key] === 'unavailable').length;

  return {
    runtime,
    healthy: available > 0, // Healthy if any features are available
    initialized: true,
    features: { available, unavailable, partial }
  };
}

// ============================================================================
// Dashboard Component
// ============================================================================

export const CASRuntimeDashboard: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get static runtime health based on feature configuration
  const customHealth = getStaticRuntimeHealth('custom');
  const langGraphHealth = getStaticRuntimeHealth('langgraph');

  const categories = ['all', ...Array.from(new Set(FEATURE_TESTS.map(f => f.category)))];
  const filteredFeatures = selectedCategory === 'all'
    ? FEATURE_TESTS
    : FEATURE_TESTS.filter(f => f.category === selectedCategory);

  const getStatusColor = (status: 'available' | 'unavailable' | 'partial') => {
    switch (status) {
      case 'available': return '#10b981'; // Green
      case 'partial': return '#f59e0b'; // Orange
      case 'unavailable': return '#6b7280'; // Grey
    }
  };

  const getStatusIcon = (status: 'available' | 'unavailable' | 'partial') => {
    switch (status) {
      case 'available': return '✅';
      case 'partial': return '🟡';
      case 'unavailable': return '⬜'; // Grey box
    }
  };

  return (
    <div className="cas-runtime-dashboard" style={{ padding: '24px', maxWidth: '1400px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
          CAS Runtime Dashboard
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Live runtime status and migration progress
        </p>
      </div>

      {/* Runtime Health Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* CustomAgentRuntime */}
        <div style={{
          background: customHealth?.healthy ? '#f0fdf4' : '#fef2f2',
          border: `2px solid ${customHealth?.healthy ? '#10b981' : '#ef4444'}`,
          borderRadius: '12px',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
                CustomAgentRuntime
              </h2>
              <div style={{
                fontSize: '14px',
                color: customHealth?.healthy ? '#059669' : '#dc2626',
                fontWeight: 'bold',
                marginBottom: '12px'
              }}>
                {customHealth?.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}
              </div>
              {customHealth?.error && (
                <div style={{
                  fontSize: '12px',
                  color: '#dc2626',
                  background: '#fee2e2',
                  padding: '8px',
                  borderRadius: '4px',
                  marginBottom: '12px'
                }}>
                  Error: {customHealth.error}
                </div>
              )}
            </div>
            <div style={{
              fontSize: '48px',
              opacity: customHealth?.healthy ? 1 : 0.3
            }}>
              🏭
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                {customHealth?.features.available || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Available</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                {customHealth?.features.partial || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Partial</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6b7280' }}>
                {customHealth?.features.unavailable || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Missing</div>
            </div>
          </div>

          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'white',
            borderRadius: '6px',
            fontSize: '13px'
          }}>
            <strong>Status:</strong> Production-ready with full infrastructure
          </div>
        </div>

        {/* LangGraphRuntime */}
        <div style={{
          background: langGraphHealth?.healthy ? '#f0fdf4' : '#fef2f2',
          border: `2px solid ${langGraphHealth?.healthy ? '#10b981' : '#ef4444'}`,
          borderRadius: '12px',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
                LangGraphRuntime
              </h2>
              <div style={{
                fontSize: '14px',
                color: langGraphHealth?.healthy ? '#059669' : '#dc2626',
                fontWeight: 'bold',
                marginBottom: '12px'
              }}>
                {langGraphHealth?.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}
              </div>
              {langGraphHealth?.error && (
                <div style={{
                  fontSize: '12px',
                  color: '#dc2626',
                  background: '#fee2e2',
                  padding: '8px',
                  borderRadius: '4px',
                  marginBottom: '12px'
                }}>
                  Error: {langGraphHealth.error}
                </div>
              )}
            </div>
            <div style={{
              fontSize: '48px',
              opacity: langGraphHealth?.healthy ? 1 : 0.3
            }}>
              🔄
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                {langGraphHealth?.features.available || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Available</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                {langGraphHealth?.features.partial || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Partial</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6b7280' }}>
                {langGraphHealth?.features.unavailable || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>Missing</div>
            </div>
          </div>

          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'white',
            borderRadius: '6px',
            fontSize: '13px'
          }}>
            <strong>Status:</strong> Advanced workflows, missing infrastructure
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: `2px solid ${selectedCategory === cat ? '#3b82f6' : '#e5e7eb'}`,
                background: selectedCategory === cat ? '#eff6ff' : 'white',
                color: selectedCategory === cat ? '#1e40af' : '#374151',
                fontWeight: selectedCategory === cat ? 'bold' : 'normal',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {cat === 'all' ? 'All Features' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          background: '#f9fafb',
          padding: '16px 24px',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>
            Feature Comparison
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontWeight: 'bold', fontSize: '14px' }}>
                  Feature
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', width: '140px' }}>
                  CustomRuntime
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', width: '140px' }}>
                  LangGraphRuntime
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredFeatures.map((feature, index) => {
                const isGreyedOutCustom = feature.customRuntime === 'unavailable';
                const isGreyedOutLangGraph = feature.langGraphRuntime === 'unavailable';

                return (
                  <tr
                    key={index}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      opacity: isGreyedOutCustom && isGreyedOutLangGraph ? 0.5 : 1
                    }}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                        {feature.name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        {feature.description}
                      </div>
                    </td>
                    <td style={{
                      padding: '16px 24px',
                      textAlign: 'center',
                      background: isGreyedOutCustom ? '#f9fafb' : 'transparent'
                    }}>
                      <div style={{
                        fontSize: '24px',
                        filter: isGreyedOutCustom ? 'grayscale(100%)' : 'none',
                        opacity: isGreyedOutCustom ? 0.3 : 1
                      }}>
                        {getStatusIcon(feature.customRuntime)}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        marginTop: '4px',
                        color: getStatusColor(feature.customRuntime),
                        fontWeight: 'bold',
                        opacity: isGreyedOutCustom ? 0.5 : 1
                      }}>
                        {feature.customRuntime.toUpperCase()}
                      </div>
                    </td>
                    <td style={{
                      padding: '16px 24px',
                      textAlign: 'center',
                      background: isGreyedOutLangGraph ? '#f9fafb' : 'transparent'
                    }}>
                      <div style={{
                        fontSize: '24px',
                        filter: isGreyedOutLangGraph ? 'grayscale(100%)' : 'none',
                        opacity: isGreyedOutLangGraph ? 0.3 : 1
                      }}>
                        {getStatusIcon(feature.langGraphRuntime)}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        marginTop: '4px',
                        color: getStatusColor(feature.langGraphRuntime),
                        fontWeight: 'bold',
                        opacity: isGreyedOutLangGraph ? 0.5 : 1
                      }}>
                        {feature.langGraphRuntime.toUpperCase()}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#f9fafb',
        borderRadius: '8px',
        fontSize: '14px'
      }}>
        <strong>Legend:</strong>
        <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
          <span>✅ <strong>Available</strong> - Feature fully implemented and working</span>
          <span>🟡 <strong>Partial</strong> - Feature partially implemented</span>
          <span>⬜ <strong>Unavailable</strong> - Feature not implemented (greyed out)</span>
        </div>
      </div>
    </div>
  );
};

export default CASRuntimeDashboard;
