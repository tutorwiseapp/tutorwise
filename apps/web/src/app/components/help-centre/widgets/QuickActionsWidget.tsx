/**
 * Filename: apps/web/src/app/components/help-centre/widgets/QuickActionsWidget.tsx
 * Purpose: Support widget with snapshot modal for bug reporting
 * Created: 2025-01-19
 * Updated: 2025-01-21 - Simplified to Report a Problem only
 */

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import SnapshotModal from '@/app/components/help-centre/modals/SnapshotModal';
import styles from './widgets.module.css';

export default function QuickActionsWidget() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pathname = usePathname();

  const handleReportProblem = () => {
    setIsModalOpen(true);
  };

  const pageContext = {
    url: typeof window !== 'undefined' ? window.location.href : (pathname || '/'),
    title: typeof document !== 'undefined' ? document.title : 'Help Centre',
  };

  return (
    <>
      <div className={styles.quickActionsWidget}>
        <h3 className={styles.quickActionsTitle}>Still Stuck?</h3>
        <p className={styles.quickActionsDescription}>
          Can&apos;t find what you&apos;re looking for? Report an issue and we&apos;ll help you out.
        </p>

        <div className={styles.actionButtons}>
          {/* Report a Problem - Snapshot Modal */}
          <button
            className={`${styles.actionButton} ${styles.primary}`}
            onClick={handleReportProblem}
          >
            Report a Problem
          </button>
        </div>
      </div>

      <SnapshotModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pageContext={pageContext}
      />
    </>
  );
}
