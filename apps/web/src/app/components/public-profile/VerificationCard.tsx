/**
 * Filename: VerificationCard.tsx
 * Purpose: Verification status card for public profile sidebar
 * Created: 2025-11-12
 *
 * Displays:
 * - Government ID verification status (green tick ✅ or red cross ❌)
 * - DBS Check verification status (green tick ✅ or red cross ❌)
 */

import type { Profile } from '@/types';
import Card from '@/app/components/ui/Card';
import { Check, X } from 'lucide-react';
import styles from './VerificationCard.module.css';

interface VerificationCardProps {
  profile: Profile;
}

export function VerificationCard({ profile }: VerificationCardProps) {
  const identityVerified = profile.identity_verified || false;
  const dbsVerified = profile.dbs_verified || false;

  return (
    <Card className={styles.verificationCard}>
      <h3 className={styles.cardTitle}>Verification</h3>

      <div className={styles.verificationsContainer}>
        {/* Government ID Status */}
        <div className={styles.verificationItem}>
          <span className={styles.label}>Government ID</span>
          <div className={styles.statusContainer}>
            {identityVerified ? (
              <>
                <div className={`${styles.statusIcon} ${styles.verified}`}>
                  <Check size={16} strokeWidth={3} />
                </div>
                <span className={`${styles.statusText} ${styles.verified}`}>
                  Verified
                </span>
              </>
            ) : (
              <>
                <div className={`${styles.statusIcon} ${styles.unverified}`}>
                  <X size={16} strokeWidth={3} />
                </div>
                <span className={`${styles.statusText} ${styles.unverified}`}>
                  Not Verified
                </span>
              </>
            )}
          </div>
        </div>

        {/* DBS Check Status */}
        <div className={styles.verificationItem}>
          <span className={styles.label}>DBS Check</span>
          <div className={styles.statusContainer}>
            {dbsVerified ? (
              <>
                <div className={`${styles.statusIcon} ${styles.verified}`}>
                  <Check size={16} strokeWidth={3} />
                </div>
                <span className={`${styles.statusText} ${styles.verified}`}>
                  Verified
                </span>
              </>
            ) : (
              <>
                <div className={`${styles.statusIcon} ${styles.unverified}`}>
                  <X size={16} strokeWidth={3} />
                </div>
                <span className={`${styles.statusText} ${styles.unverified}`}>
                  Not Verified
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
