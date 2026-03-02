'use client';

import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import {
  ProcessStudioCanvas,
  DiscoveryPanel,
  useDiscoveryStore,
} from '@/components/feature/process-studio';
import type { DiscoveryTab } from '@/components/feature/process-studio/discovery-store';
import styles from './page.module.css';

export default function ProcessStudioPage() {
  const activeTab = useDiscoveryStore((s) => s.activeTab);
  const setActiveTab = useDiscoveryStore((s) => s.setActiveTab);

  const tabs = [
    { id: 'design', label: 'Design', active: activeTab === 'design' },
    { id: 'discovery', label: 'Discovery', active: activeTab === 'discovery' },
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

      {activeTab === 'discovery' && (
        <div className={styles.discoveryContainer}>
          <DiscoveryPanel />
        </div>
      )}
    </HubPageLayout>
  );
}
