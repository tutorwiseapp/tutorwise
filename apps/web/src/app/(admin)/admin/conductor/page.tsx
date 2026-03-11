'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { HubPageLayout, HubHeader } from '@/app/components/hub/layout';
import {
  WorkflowCanvas,
  DiscoveryPanel,
  useDiscoveryStore,
} from '@/components/feature/workflow';
import { ExecutionPanel } from '@/components/feature/workflow/ExecutionPanel';
import { MonitoringPanel } from '@/components/feature/workflow/MonitoringPanel';
import { IntelligencePanel } from '@/components/feature/conductor/IntelligencePanel';
import { SpacesPanel } from '@/components/feature/conductor/SpacesPanel';
import { KnowledgePanel } from '@/components/feature/conductor/KnowledgePanel';
import { MiningPanel } from '@/components/feature/conductor/MiningPanel';
import type { DiscoveryTab } from '@/components/feature/workflow/discovery-store';
import ErrorBoundary from '@/app/components/ui/feedback/ErrorBoundary';
import dynamic from 'next/dynamic';
import styles from './page.module.css';

function TabError({ tab }: { tab: string }) {
  return (
    <div style={{ padding: '40px 24px', textAlign: 'center', color: '#9ca3af' }}>
      <p style={{ color: '#ef4444', fontWeight: 600, marginBottom: 8 }}>Failed to load {tab} tab</p>
      <p style={{ fontSize: 13 }}>Refresh the page or try again.</p>
    </div>
  );
}

const AgentManagementPanel = dynamic(
  () => import('@/components/feature/conductor/AgentManagementPanel').then((m) => ({ default: m.AgentManagementPanel })),
  { ssr: false, loading: () => <div style={{ padding: 40, color: '#9ca3af' }}>Loading agents…</div> }
);

const TeamCanvas = dynamic(
  () => import('@/components/feature/conductor/TeamCanvas').then((m) => ({ default: m.TeamCanvas })),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
        Loading Teams canvas…
      </div>
    ),
  }
);

const BuildCanvas = dynamic(
  () => import('@/components/feature/conductor/BuildCanvas').then((m) => ({ default: m.BuildCanvas })),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
        Loading Build canvas…
      </div>
    ),
  }
);

const SimulationPanel = dynamic(
  () => import('@/components/feature/conductor/SimulationPanel').then((m) => ({ default: m.SimulationPanel })),
  { ssr: false, loading: () => <div style={{ padding: 40, color: '#9ca3af' }}>Loading Simulation…</div> }
);

const EvalPanel = dynamic(
  () => import('@/components/feature/conductor/EvalPanel').then((m) => ({ default: m.EvalPanel })),
  { ssr: false, loading: () => <div style={{ padding: 40, color: '#9ca3af' }}>Loading Eval…</div> }
);

const MCPPanel = dynamic(
  () => import('@/components/feature/conductor/MCPPanel').then((m) => ({ default: m.MCPPanel })),
  { ssr: false, loading: () => <div style={{ padding: 40, color: '#9ca3af' }}>Loading Integrations…</div> }
);

// Tabs in lifecycle order: Design → Build → Execute → Observe
const TABS: { id: DiscoveryTab; label: string }[] = [
  // Design
  { id: 'workflows',    label: 'Workflows' },
  { id: 'discovery',   label: 'Discovery' },
  // Build
  { id: 'build',       label: 'Build' },
  { id: 'agents',      label: 'Agents' },
  { id: 'teams',       label: 'Teams' },
  { id: 'spaces',      label: 'Spaces' },
  { id: 'knowledge',   label: 'Knowledge' },
  { id: 'integrations',label: 'Integrations' },
  // Execute
  { id: 'execution',   label: 'Execution' },
  { id: 'simulation',  label: 'Simulation' },
  { id: 'eval',        label: 'Eval' },
  // Observe
  { id: 'monitoring',  label: 'Monitoring' },
  { id: 'intelligence',label: 'Intelligence' },
  { id: 'mining',      label: 'Mining' },
];

// Lifecycle stages with their tab IDs
const STAGES: { label: string; tabs: DiscoveryTab[]; number: number }[] = [
  { number: 1, label: 'Design',  tabs: ['workflows', 'discovery'] },
  { number: 2, label: 'Build',   tabs: ['build', 'agents', 'teams', 'spaces', 'knowledge', 'integrations'] },
  { number: 3, label: 'Execute', tabs: ['execution', 'simulation', 'eval'] },
  { number: 4, label: 'Observe', tabs: ['monitoring', 'intelligence', 'mining'] },
];

function getActiveStage(activeTab: DiscoveryTab): number {
  const stage = STAGES.find((s) => s.tabs.includes(activeTab));
  return stage?.number ?? 1;
}

export default function ConductorPage() {
  const activeTab = useDiscoveryStore((s) => s.activeTab);
  const setActiveTab = useDiscoveryStore((s) => s.setActiveTab);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Phase 4B: Intent routing callbacks for ExecutionCommandBar
  const handleNavigateToAgent = useCallback((slug: string, prompt?: string) => {
    const url = `/admin/conductor/agents/${slug}${prompt ? `?prompt=${encodeURIComponent(prompt)}` : ''}`;
    router.push(url);
  }, [router]);

  const handleNavigateToTab = useCallback((tab: string) => {
    setActiveTab(tab as DiscoveryTab);
  }, [setActiveTab]);

  // Sync ?tab= URL param; default to 'workflows' when no param present
  useEffect(() => {
    const tab = searchParams.get('tab') as DiscoveryTab | null;
    setActiveTab(tab ?? 'workflows');
  }, [searchParams, setActiveTab]);

  const activeStage = getActiveStage(activeTab);

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Conductor"
          subtitle="Design, visualise and manage workflow processes"
        />
      }
      fullWidth
    >
      <div className={styles.navRow}>
        {/* Lifecycle stage bar */}
        <div className={styles.stageBar}>
          {STAGES.map((stage) => (
            <button
              key={stage.number}
              className={`${styles.stage} ${activeStage === stage.number ? styles.stageActive : ''}`}
              onClick={() => setActiveTab(stage.tabs[0])}
            >
              <span className={styles.stageNumber}>{stage.number}</span>
              {stage.label}
            </button>
          ))}
        </div>

        {/* Tab navigation */}
        <div className={styles.navTabs}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.navTab} ${activeTab === tab.id ? styles.navTabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'workflows' && (
        <ErrorBoundary fallback={<TabError tab="Workflows" />}>
          <div className={styles.canvasContainer}>
            <WorkflowCanvas />
          </div>
        </ErrorBoundary>
      )}

      {/* Always mounted so background auto-scan fires on page load */}
      <ErrorBoundary fallback={<TabError tab="Discovery" />}>
        <div
          className={styles.discoveryContainer}
          style={{ display: activeTab === 'discovery' ? undefined : 'none' }}
        >
          <DiscoveryPanel />
        </div>
      </ErrorBoundary>

      {activeTab === 'execution' && (
        <ErrorBoundary fallback={<TabError tab="Execution" />}>
          <div className={styles.executionContainer}>
            <ExecutionPanel
              onNavigateToAgent={handleNavigateToAgent}
              onNavigateToTab={handleNavigateToTab}
            />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'simulation' && (
        <ErrorBoundary fallback={<TabError tab="Simulation" />}>
          <div className={styles.executionContainer}>
            <SimulationPanel />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'eval' && (
        <ErrorBoundary fallback={<TabError tab="Eval" />}>
          <div className={styles.executionContainer}>
            <EvalPanel />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'agents' && (
        <ErrorBoundary fallback={<TabError tab="Agents" />}>
          <div className={styles.agentsContainer}>
            <AgentManagementPanel />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'teams' && (
        <ErrorBoundary fallback={<TabError tab="Teams" />}>
          <div className={styles.teamsContainer}>
            <TeamCanvas />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'spaces' && (
        <ErrorBoundary fallback={<TabError tab="Spaces" />}>
          <div className={styles.spacesContainer}>
            <SpacesPanel />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'knowledge' && (
        <ErrorBoundary fallback={<TabError tab="Knowledge" />}>
          <div className={styles.intelligenceContainer}>
            <KnowledgePanel />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'integrations' && (
        <ErrorBoundary fallback={<TabError tab="Integrations" />}>
          <div className={styles.executionContainer}>
            <MCPPanel />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'build' && (
        <ErrorBoundary fallback={<TabError tab="Build" />}>
          <div className={styles.canvasContainer}>
            <BuildCanvas />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'monitoring' && (
        <ErrorBoundary fallback={<TabError tab="Monitoring" />}>
          <div className={styles.monitoringContainer}>
            <MonitoringPanel />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'intelligence' && (
        <ErrorBoundary fallback={<TabError tab="Intelligence" />}>
          <div className={styles.intelligenceContainer}>
            <IntelligencePanel />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === 'mining' && (
        <ErrorBoundary fallback={<TabError tab="Mining" />}>
          <div className={styles.intelligenceContainer}>
            <MiningPanel />
          </div>
        </ErrorBoundary>
      )}
    </HubPageLayout>
  );
}
