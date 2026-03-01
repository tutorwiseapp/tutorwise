'use client';

import { HubPageLayout, HubHeader } from '@/app/components/hub/layout';
import { ProcessStudioCanvas } from '@/components/feature/process-studio';
import styles from './page.module.css';

export default function ProcessStudioPage() {
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
      <div className={styles.canvasContainer}>
        <ProcessStudioCanvas />
      </div>
    </HubPageLayout>
  );
}
