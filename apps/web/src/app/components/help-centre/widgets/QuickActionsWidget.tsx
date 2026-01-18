/**
 * Filename: apps/web/src/app/components/help-centre/widgets/QuickActionsWidget.tsx
 * Purpose: Support widget with two clear options - bug reports and general help
 * Created: 2025-01-19
 * Updated: 2026-01-18 - Added Get Help modal with clear distinction
 */

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import SnapshotModal from '@/app/components/help-centre/modals/SnapshotModal';
import GetHelpModal from '@/app/components/help-centre/modals/GetHelpModal';
import { Bug, HelpCircle } from 'lucide-react';
import styles from './widgets.module.css';

export default function QuickActionsWidget() {
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isGetHelpModalOpen, setIsGetHelpModalOpen] = useState(false);
  const pathname = usePathname();

  const pageContext = {
    url: typeof window !== 'undefined' ? window.location.href : (pathname || '/'),
    title: typeof document !== 'undefined' ? document.title : 'Help Centre',
  };

  return (
    <>
      <div className={styles.quickActionsWidget}>
        <h3 className={styles.quickActionsTitle}>Still Stuck?</h3>
        <p className={styles.quickActionsDescription}>
          Choose the option that matches your situation:
        </p>

        <div className={styles.actionButtons}>
          {/* Report a Problem - For Software Bugs */}
          <button
            className={`${styles.actionButton} ${styles.problemButton}`}
            onClick={() => setIsSnapshotModalOpen(true)}
          >
            <Bug size={18} className={styles.buttonIcon} />
            <div className={styles.buttonContent}>
              <span className={styles.buttonTitle}>Report a Problem</span>
              <span className={styles.buttonDescription}>
                Something&apos;s broken or not working
              </span>
            </div>
          </button>

          {/* Get Help - For General Questions */}
          <button
            className={`${styles.actionButton} ${styles.helpButton}`}
            onClick={() => setIsGetHelpModalOpen(true)}
          >
            <HelpCircle size={18} className={styles.buttonIcon} />
            <div className={styles.buttonContent}>
              <span className={styles.buttonTitle}>Get Help</span>
              <span className={styles.buttonDescription}>
                I have a question or need assistance
              </span>
            </div>
          </button>
        </div>
      </div>

      <SnapshotModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        pageContext={pageContext}
      />

      <GetHelpModal
        isOpen={isGetHelpModalOpen}
        onClose={() => setIsGetHelpModalOpen(false)}
        pageContext={pageContext}
      />
    </>
  );
}
