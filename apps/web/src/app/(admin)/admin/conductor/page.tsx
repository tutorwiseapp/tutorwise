'use client';

import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import {
  WorkflowCanvas,
  DiscoveryPanel,
  useDiscoveryStore,
} from '@/components/feature/workflow';
import { ExecutionPanel } from '@/components/feature/workflow/ExecutionPanel';
import type { DiscoveryTab } from '@/components/feature/workflow/discovery-store';
import styles from './page.module.css';

export default function ConductorPage() {
  const activeTab = useDiscoveryStore((s) => s.activeTab);
  const setActiveTab = useDiscoveryStore((s) => s.setActiveTab);

  const tabs = [
    { id: 'design', label: 'Design', active: activeTab === 'design' },
    { id: 'discovery', label: 'Discovery', active: activeTab === 'discovery' },
    { id: 'execution', label: 'Execution', active: activeTab === 'execution' },
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
    </HubPageLayout>
  );
}
