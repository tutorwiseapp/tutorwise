'use client';

import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import {
  WorkflowCanvas,
  DiscoveryPanel,
  useDiscoveryStore,
} from '@/components/feature/workflow';
import { ExecutionPanel } from '@/components/feature/workflow/ExecutionPanel';
import { MonitoringPanel } from '@/components/feature/workflow/MonitoringPanel';
import type { DiscoveryTab } from '@/components/feature/workflow/discovery-store';
import dynamic from 'next/dynamic';
import styles from './page.module.css';

const AgentManagementPanel = dynamic(
  () => import('@/components/feature/conductor/AgentManagementPanel').then((m) => ({ default: m.AgentManagementPanel })),
  { ssr: false, loading: () => <div style={{ padding: 40, color: '#9ca3af' }}>Loading agents…</div> }
);

// WorkflowVisualizer may use browser APIs — load client-side only
const WorkflowVisualizer = dynamic(
  () => import('@cas/packages/core/src/admin').then((m) => ({ default: m.WorkflowVisualizer })),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
        Loading Teams visualizer…
      </div>
    ),
  }
);

export default function ConductorPage() {
  const activeTab = useDiscoveryStore((s) => s.activeTab);
  const setActiveTab = useDiscoveryStore((s) => s.setActiveTab);

  const tabs = [
    { id: 'design', label: 'Design', active: activeTab === 'design' },
    { id: 'discovery', label: 'Discovery', active: activeTab === 'discovery' },
    { id: 'execution', label: 'Execution', active: activeTab === 'execution' },
    { id: 'agents', label: 'Agents', active: activeTab === 'agents' },
    { id: 'teams', label: 'Teams', active: activeTab === 'teams' },
    { id: 'monitoring', label: 'Monitoring', active: activeTab === 'monitoring' },
  ];

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
      <HubTabs
        tabs={tabs}
        onTabChange={(tabId) => setActiveTab(tabId as DiscoveryTab)}
      />

      {activeTab === 'design' && (
        <div className={styles.canvasContainer}>
          <WorkflowCanvas />
        </div>
      )}

      {/* Always mounted so background auto-scan fires on page load (Phase 4) */}
      <div
        className={styles.discoveryContainer}
        style={{ display: activeTab === 'discovery' ? undefined : 'none' }}
      >
        <DiscoveryPanel />
      </div>

      {activeTab === 'execution' && (
        <div className={styles.executionContainer}>
          <ExecutionPanel />
        </div>
      )}

      {activeTab === 'agents' && (
        <div className={styles.agentsContainer}>
          <AgentManagementPanel />
        </div>
      )}

      {activeTab === 'teams' && (
        <div className={styles.teamsContainer}>
          <WorkflowVisualizer />
        </div>
      )}

      {activeTab === 'monitoring' && (
        <div className={styles.monitoringContainer}>
          <MonitoringPanel />
        </div>
      )}
    </HubPageLayout>
  );
}
