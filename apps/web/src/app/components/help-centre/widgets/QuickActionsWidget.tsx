/**
 * Filename: apps/web/src/app/components/help-centre/widgets/QuickActionsWidget.tsx
 * Purpose: Quick Actions widget for help centre right sidebar
 * Created: 2025-01-19
 */

'use client';

import styles from './widgets.module.css';

export default function QuickActionsWidget() {
  const handleEmailSupport = () => {
    window.location.href = 'mailto:support@tutorwise.com?subject=Help Centre Support Request';
  };

  const handleLiveChat = () => {
    // TODO: Integrate with Crisp chat when available
    // For now, fallback to email
    if (typeof window !== 'undefined' && (window as any).$crisp) {
      (window as any).$crisp.push(['do', 'chat:open']);
    } else {
      handleEmailSupport();
    }
  };

  return (
    <div className={styles.quickActionsWidget}>
      <h3 className={styles.quickActionsTitle}>Still Stuck?</h3>
      <p className={styles.quickActionsDescription}>
        Can&apos;t find what you&apos;re looking for? Get help from our support team.
      </p>

      <div className={styles.actionButtons}>
        <button className={`${styles.actionButton} ${styles.primary}`} onClick={handleLiveChat}>
          <span>💬</span>
          <span>Live Chat</span>
        </button>

        <button className={`${styles.actionButton} ${styles.secondary}`} onClick={handleEmailSupport}>
          <span>📧</span>
          <span>Ask a Question</span>
        </button>
      </div>

      <p className={styles.actionMicrocopy}>
        We typically respond within 24 hours on business days.
      </p>
    </div>
  );
}
