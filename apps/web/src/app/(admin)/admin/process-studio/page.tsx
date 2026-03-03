'use client';

import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import {
  ProcessStudioCanvas,
  DiscoveryPanel,
  useDiscoveryStore,
} from '@/components/feature/process-studio';
import { ExecutionPanel } from '@/components/feature/process-studio/ExecutionPanel';
import type { DiscoveryTab } from '@/components/feature/process-studio/discovery-store';
import styles from './page.module.css';

export default function ProcessStudioPage() {
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
          title="Process Studio"
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
          <ProcessStudioCanvas />
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
