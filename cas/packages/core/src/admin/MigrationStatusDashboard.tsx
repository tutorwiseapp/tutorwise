/**
 * CAS Migration Status Dashboard
 *
 * Shows migration progress from CustomAgentRuntime to LangGraphRuntime
 *
 * Tracks:
 * - Feature implementation status
 * - Migration phases
 * - Progress percentage
 * - Next steps
 */

import React from 'react';

export type FeatureStatus = 'implemented' | 'in_progress' | 'not_started' | 'blocked';

export interface Feature {
  id: string;
  name: string;
  description: string;
  customRuntime: boolean;
  langGraphRuntime: FeatureStatus;
  priority: 'critical' | 'important' | 'nice_to_have';
  phase: 1 | 2 | 3 | 4 | 5;
  estimatedHours: number;
  actualHours?: number; // Track actual time spent
  completedDate?: string; // Track completion date
  dependencies?: string[];
  notes?: string;
}

export interface MigrationPhase {
  phase: number;
  name: string;
  description: string;
  features: Feature[];
  totalHours: number;
  actualHours: number; // Actual hours spent so far
  completed: number;
  inProgress: number;
  notStarted: number;
}

// ============================================================================
// Feature Definitions
// ============================================================================

const FEATURES: Feature[] = [
  // Phase 1: Core Infrastructure (CRITICAL)
  {
    id: 'supabase-integration',
    name: 'Supabase Integration',
    description: 'Database client, connection pooling, query helpers - COMPLETED',
    customRuntime: true,
    langGraphRuntime: 'implemented',
    priority: 'critical',
    phase: 1,
    estimatedHours: 3,
    actualHours: 3, // Completed on time
    completedDate: '2026-02-26',
    notes: 'Full adapter with checkpointing, events, metrics, logs'
  },
  {
    id: 'workflow-state-persistence',
    name: 'Workflow State Persistence',
    description: 'Save/load WorkflowState with resume and rollback - COMPLETED',
    customRuntime: true,
    langGraphRuntime: 'implemented',
    priority: 'critical',
    phase: 1,
    estimatedHours: 2,
    actualHours: 2,
    completedDate: '2026-02-26',
    dependencies: ['supabase-integration'],
    notes: 'Added resumeWorkflow(), rollbackWorkflow(), and getWorkflowHistory() methods'
  },
  {
    id: 'message-bus',
    name: 'Message Bus',
    description: 'Redis/InMemory message bus for distributed execution',
    customRuntime: true,
    langGraphRuntime: 'implemented',
    priority: 'critical',
    phase: 1,
    estimatedHours: 2,
    actualHours: 1.5,
    completedDate: '2026-02-26',
    dependencies: ['supabase-integration'],
    notes: 'Integrated InMemoryMessageBus and RedisMessageBus into LangGraphRuntime with workflow event publishing'
  },
  {
    id: 'circuit-breaker',
    name: 'Circuit Breaker',
    description: 'Per-agent circuit breaker for AI API protection - COMPLETED',
    customRuntime: true,
    langGraphRuntime: 'implemented',
    priority: 'critical',
    phase: 1,
    estimatedHours: 2,
    actualHours: 2,
    completedDate: '2026-02-26',
    dependencies: ['supabase-integration'],
    notes: 'Reused existing CircuitBreaker.ts with Supabase state persistence'
  },
  {
    id: 'retry-logic',
    name: 'Retry Logic',
    description: 'Exponential backoff retry for transient errors',
    customRuntime: true,
    langGraphRuntime: 'not_started',
    priority: 'critical',
    phase: 1,
    estimatedHours: 1,
    dependencies: ['circuit-breaker']
  },

  // Phase 2: Task Management (CRITICAL)
  {
    id: 'execute-task',
    name: 'Single Task Execution',
    description: 'executeTask() method for running one agent task directly',
    customRuntime: true,
    langGraphRuntime: 'not_started',
    priority: 'critical',
    phase: 2,
    estimatedHours: 2,
    notes: 'Bypass workflow for single task execution'
  },
  {
    id: 'stream-task',
    name: 'Task Streaming',
    description: 'AsyncGenerator for real-time progress updates',
    customRuntime: true,
    langGraphRuntime: 'not_started',
    priority: 'important',
    phase: 2,
    estimatedHours: 2,
    dependencies: ['execute-task']
  },
  {
    id: 'cancel-task',
    name: 'Task Cancellation',
    description: 'Cancel running tasks with cleanup',
    customRuntime: true,
    langGraphRuntime: 'not_started',
    priority: 'important',
    phase: 2,
    estimatedHours: 1,
    dependencies: ['execute-task']
  },
  {
    id: 'progress-callbacks',
    name: 'Progress Callbacks',
    description: 'Enhanced onProgress with real-time updates',
    customRuntime: true,
    langGraphRuntime: 'in_progress',
    priority: 'important',
    phase: 2,
    estimatedHours: 1,
    notes: 'Basic logging exists, needs enhancement'
  },

  // Phase 3: State Management (CRITICAL)
  {
    id: 'agent-state-persistence',
    name: 'Agent State Persistence',
    description: 'Persist agent state to cas_agent_config table',
    customRuntime: true,
    langGraphRuntime: 'not_started',
    priority: 'critical',
    phase: 3,
    estimatedHours: 2,
    dependencies: ['supabase-integration']
  },
  {
    id: 'get-agent-state',
    name: 'Get Agent State',
    description: 'getAgentState() method to retrieve from DB',
    customRuntime: true,
    langGraphRuntime: 'not_started',
    priority: 'critical',
    phase: 3,
    estimatedHours: 1,
    dependencies: ['agent-state-persistence']
  },
  {
    id: 'update-agent-state',
    name: 'Update Agent State',
    description: 'updateAgentState() with version tracking',
    customRuntime: true,
    langGraphRuntime: 'not_started',
    priority: 'critical',
    phase: 3,
    estimatedHours: 1,
    dependencies: ['agent-state-persistence']
  },
  {
    id: 'reset-agent-state',
    name: 'Reset Agent State',
    description: 'resetAgentState() with audit trail',
    customRuntime: true,
    langGraphRuntime: 'not_started',
    priority: 'important',
    phase: 3,
    estimatedHours: 1,
    dependencies: ['update-agent-state']
  },

  // Phase 4: Observability (CRITICAL)
  {
    id: 'event-logging',
    name: 'Event Logging',
    description: 'Log events to cas_agent_events table',
    customRuntime: true,
    langGraphRuntime: 'not_started',
    priority: 'critical',
    phase: 4,
    estimatedHours: 2,
    dependencies: ['supabase-integration'],
    notes: 'Log: workflow_started, step_completed, workflow_failed, etc.'
  },
  {
    id: 'metrics-collection',
    name: 'Metrics Collection',
    description: 'Collect metrics to cas_metrics_timeseries',
    customRuntime: true,
    langGraphRuntime: 'not_started',
    priority: 'critical',
    phase: 4,
    estimatedHours: 2,
    dependencies: ['supabase-integration'],
    notes: 'Track: workflow_duration_ms, agent_execution_time, etc.'
  },
  {
    id: 'log-persistence',
    name: 'Log Persistence',
    description: 'Persist logs to cas_agent_logs table',
    customRuntime: true,
    langGraphRuntime: 'not_started',
    priority: 'critical',
    phase: 4,
    estimatedHours: 1,
    dependencies: ['supabase-integration']
  },
  {
    id: 'observability-methods',
    name: 'Observability Methods',
    description: 'getMetrics(), getLogs(), getEventHistory()',
    customRuntime: true,
    langGraphRuntime: 'not_started',
    priority: 'important',
    phase: 4,
    estimatedHours: 2,
    dependencies: ['event-logging', 'metrics-collection', 'log-persistence']
  },

  // Phase 5: Agent Management (IMPORTANT)
  {
    id: 'register-agent',
    name: 'Register Agent',
    description: 'registerAgent() for dynamic agent registration',
    customRuntime: true,
    langGraphRuntime: 'not_started',
    priority: 'important',
    phase: 5,
    estimatedHours: 1,
    dependencies: ['supabase-integration']
  },
  {
    id: 'deregister-agent',
    name: 'Deregister Agent',
    description: 'deregisterAgent() with cleanup',
    customRuntime: true,
    langGraphRuntime: 'not_started',
    priority: 'important',
    phase: 5,
    estimatedHours: 1,
    dependencies: ['register-agent']
  },
  {
    id: 'agent-status-db',
    name: 'Agent Status (DB)',
    description: 'getAgentStatus() from cas_agent_status table',
    customRuntime: true,
    langGraphRuntime: 'in_progress',
    priority: 'important',
    phase: 5,
    estimatedHours: 1,
    dependencies: ['supabase-integration'],
    notes: 'Basic health check exists, needs DB persistence'
  },

  // Existing Features (IMPLEMENTED in LangGraph)
  {
    id: 'agent-registry',
    name: 'Agent Registry',
    description: 'AgentRegistry with 8 agents',
    customRuntime: true,
    langGraphRuntime: 'implemented',
    priority: 'critical',
    phase: 1,
    estimatedHours: 0
  },
  {
    id: 'workflow-state-graph',
    name: 'Workflow StateGraph',
    description: 'LangGraph StateGraph orchestration',
    customRuntime: false,
    langGraphRuntime: 'implemented',
    priority: 'critical',
    phase: 1,
    estimatedHours: 0,
    notes: 'LangGraph advantage - better than CustomRuntime'
  },
  {
    id: 'workflow-execution',
    name: 'Workflow Execution',
    description: 'Execute multi-agent workflows',
    customRuntime: true,
    langGraphRuntime: 'implemented',
    priority: 'critical',
    phase: 1,
    estimatedHours: 0
  },
  {
    id: 'sequential-parallel',
    name: 'Sequential/Parallel Tasks',
    description: 'Support for sequential and parallel execution',
    customRuntime: true,
    langGraphRuntime: 'implemented',
    priority: 'critical',
    phase: 1,
    estimatedHours: 0
  },
];

// ============================================================================
// Calculate Migration Phases
// ============================================================================

function calculatePhases(features: Feature[]): MigrationPhase[] {
  const phases: MigrationPhase[] = [];

  for (let phaseNum = 1; phaseNum <= 5; phaseNum++) {
    const phaseFeatures = features.filter(f => f.phase === phaseNum);

    const completed = phaseFeatures.filter(f => f.langGraphRuntime === 'implemented').length;
    const inProgress = phaseFeatures.filter(f => f.langGraphRuntime === 'in_progress').length;
    const notStarted = phaseFeatures.filter(f => f.langGraphRuntime === 'not_started').length;
    const totalHours = phaseFeatures.reduce((sum, f) => sum + f.estimatedHours, 0);
    const actualHours = phaseFeatures.reduce((sum, f) => sum + (f.actualHours || 0), 0);

    let name = '';
    let description = '';

    switch (phaseNum) {
      case 1:
        name = 'Core Infrastructure';
        description = 'Database, message bus, circuit breaker, retry logic';
        break;
      case 2:
        name = 'Task Management';
        description = 'Single task execution, streaming, cancellation';
        break;
      case 3:
        name = 'State Management';
        description = 'Persistent agent state with versioning';
        break;
      case 4:
        name = 'Observability';
        description = 'Events, metrics, logs to database';
        break;
      case 5:
        name = 'Agent Management';
        description = 'Dynamic registration, health checks';
        break;
    }

    phases.push({
      phase: phaseNum,
      name,
      description,
      features: phaseFeatures,
      totalHours,
      actualHours,
      completed,
      inProgress,
      notStarted
    });
  }

  return phases;
}

// ============================================================================
// Migration Status Dashboard Component
// ============================================================================

export const MigrationStatusDashboard: React.FC = () => {
  const phases = calculatePhases(FEATURES);

  const totalFeatures = FEATURES.length;
  const implemented = FEATURES.filter(f => f.langGraphRuntime === 'implemented').length;
  const inProgress = FEATURES.filter(f => f.langGraphRuntime === 'in_progress').length;
  const notStarted = FEATURES.filter(f => f.langGraphRuntime === 'not_started').length;
  const totalHours = FEATURES.filter(f => f.langGraphRuntime !== 'implemented')
    .reduce((sum, f) => sum + f.estimatedHours, 0);
  const actualHoursSpent = FEATURES.reduce((sum, f) => sum + (f.actualHours || 0), 0);

  const completionPercent = Math.round((implemented / totalFeatures) * 100);

  return (
    <div className="migration-dashboard" style={{ padding: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
          CAS Migration Status
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          CustomAgentRuntime → LangGraphRuntime (Like-for-Like Migration)
        </p>
      </div>

      {/* Overall Progress */}
      <div style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '32px'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
          Overall Progress
        </h2>

        {/* Progress Bar */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '14px'
          }}>
            <span>{completionPercent}% Complete</span>
            <span>
              {totalHours}h remaining
              {actualHoursSpent > 0 && (
                <span style={{ color: '#10b981', marginLeft: '8px' }}>
                  ({actualHoursSpent}h spent)
                </span>
              )}
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '24px',
            background: '#e5e7eb',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${completionPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginTop: '16px'
        }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
              {implemented}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>✅ Implemented</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
              {inProgress}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>🟡 In Progress</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
              {notStarted}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>❌ Not Started</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
              {totalFeatures}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>Total Features</div>
          </div>
        </div>
      </div>

      {/* Migration Phases */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
          Migration Phases
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {phases.map(phase => {
            const phasePercent = phase.features.length > 0
              ? Math.round((phase.completed / phase.features.length) * 100)
              : 0;

            return (
              <div
                key={phase.phase}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      Phase {phase.phase}: {phase.name}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#666' }}>{phase.description}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{phasePercent}%</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {phase.totalHours}h {phase.actualHours > 0 && `(${phase.actualHours}h)`}
                    </div>
                  </div>
                </div>

                {/* Phase Progress Bar */}
                <div style={{
                  width: '100%',
                  height: '8px',
                  background: '#e5e7eb',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: `${phasePercent}%`,
                    height: '100%',
                    background: '#10b981',
                    transition: 'width 0.3s'
                  }} />
                </div>

                {/* Phase Stats */}
                <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                  <span>✅ {phase.completed}</span>
                  <span>🟡 {phase.inProgress}</span>
                  <span>❌ {phase.notStarted}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Checklist */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
          Feature Checklist
        </h2>

        {phases.map(phase => (
          <div key={phase.phase} style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '12px',
              color: '#374151'
            }}>
              Phase {phase.phase}: {phase.name}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {phase.features.map(feature => {
                let statusIcon = '❌';
                let statusColor = '#ef4444';

                if (feature.langGraphRuntime === 'implemented') {
                  statusIcon = '✅';
                  statusColor = '#10b981';
                } else if (feature.langGraphRuntime === 'in_progress') {
                  statusIcon = '🟡';
                  statusColor = '#f59e0b';
                }

                return (
                  <div
                    key={feature.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <span style={{ fontSize: '18px', marginRight: '12px' }}>{statusIcon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                            {feature.name}
                            {feature.completedDate && (
                              <span style={{ marginLeft: '8px', fontSize: '11px', color: '#10b981', fontWeight: 'normal' }}>
                                ✓ {feature.completedDate}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                            {feature.description}
                          </div>
                          {feature.notes && (
                            <div style={{
                              fontSize: '12px',
                              color: '#3b82f6',
                              marginTop: '4px',
                              fontStyle: 'italic'
                            }}>
                              💡 {feature.notes}
                            </div>
                          )}
                          {feature.dependencies && feature.dependencies.length > 0 && (
                            <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '4px' }}>
                              ⚠️ Depends on: {feature.dependencies.join(', ')}
                            </div>
                          )}
                        </div>
                        <div style={{
                          textAlign: 'right',
                          fontSize: '12px',
                          color: '#666'
                        }}>
                          {feature.estimatedHours > 0 && (
                            <div>
                              {feature.estimatedHours}h
                              {feature.actualHours !== undefined && (
                                <span style={{ color: feature.actualHours <= feature.estimatedHours ? '#10b981' : '#f59e0b' }}>
                                  {' '}({feature.actualHours}h)
                                </span>
                              )}
                            </div>
                          )}
                          <div style={{
                            marginTop: '4px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: feature.priority === 'critical' ? '#fee2e2' :
                                       feature.priority === 'important' ? '#fef3c7' : '#e0e7ff',
                            color: feature.priority === 'critical' ? '#991b1b' :
                                   feature.priority === 'important' ? '#92400e' : '#3730a3',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}>
                            {feature.priority.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Next Steps */}
      <div style={{
        marginTop: '32px',
        padding: '24px',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
          🚀 Next Steps
        </h2>
        <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>Start with <strong>Phase 1: Core Infrastructure</strong> (critical features)</li>
          <li>Implement <strong>Supabase integration</strong> first (blocks other features)</li>
          <li>Add <strong>circuit breaker + retry logic</strong> for reliability</li>
          <li>Move to <strong>Phase 2: Task Management</strong></li>
          <li>Then <strong>Phase 3: State Management</strong></li>
          <li>Finish with <strong>Phase 4: Observability</strong> and <strong>Phase 5: Agent Management</strong></li>
        </ol>
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'white',
          borderRadius: '6px',
          fontSize: '14px'
        }}>
          <strong>Estimated Total Time:</strong> {totalHours} hours AI coding + ~8-12 hours testing
        </div>
      </div>
    </div>
  );
};

export default MigrationStatusDashboard;
