/**
 * Filename: AIAgentTrustCard.tsx
 * Purpose: AI-specific trust signals card for AI tutor public profile sidebar
 * Created: 2026-03-03
 *
 * Replaces VerificationCard. Shows automated AI trust checks instead of human verification:
 * - Quality Checked: automated (all published agents pass)
 * - Child Safe: platform content filtering policy
 * - Platform Owned: green if Tutorwise official, amber if third-party creator
 */

import Card from '@/components/ui/data-display/Card';
import { Check, AlertTriangle } from 'lucide-react';
import type { AIAgentPublicProfile } from './AIAgentHeroSection';
import styles from './AIAgentTrustCard.module.css';

interface AIAgentTrustCardProps {
  agent: AIAgentPublicProfile;
}

export function AIAgentTrustCard({ agent }: AIAgentTrustCardProps) {
  return (
    <Card className={styles.trustCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Trust & Safety</h3>
      </div>

      <div className={styles.itemsContainer}>
        {/* Quality Checked: automated for all published agents */}
        <div className={styles.item}>
          <span className={styles.label}>Quality Checked</span>
          <div className={styles.statusContainer}>
            <div className={`${styles.statusIcon} ${styles.verified}`}>
              <Check size={14} strokeWidth={3} />
            </div>
            <span className={`${styles.statusText} ${styles.verified}`}>Passed</span>
          </div>
        </div>

        {/* Child Safe: platform content filtering policy */}
        <div className={styles.item}>
          <span className={styles.label}>Child Safe</span>
          <div className={styles.statusContainer}>
            <div className={`${styles.statusIcon} ${styles.verified}`}>
              <Check size={14} strokeWidth={3} />
            </div>
            <span className={`${styles.statusText} ${styles.verified}`}>Filtered</span>
          </div>
        </div>

        {/* Platform Owned */}
        <div className={styles.item}>
          <span className={styles.label}>Platform Owned</span>
          <div className={styles.statusContainer}>
            {agent.is_platform_owned ? (
              <>
                <div className={`${styles.statusIcon} ${styles.verified}`}>
                  <Check size={14} strokeWidth={3} />
                </div>
                <span className={`${styles.statusText} ${styles.verified}`}>Official</span>
              </>
            ) : (
              <>
                <div className={`${styles.statusIcon} ${styles.thirdParty}`}>
                  <AlertTriangle size={14} strokeWidth={2.5} />
                </div>
                <span className={`${styles.statusText} ${styles.thirdParty}`}>3rd Party</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
