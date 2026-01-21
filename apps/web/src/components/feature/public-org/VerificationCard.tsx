/**
 * Filename: VerificationCard.tsx
 * Purpose: Display organisation business verifications and credentials
 * Created: 2025-12-31
 */

'use client';

import { Check, X } from 'lucide-react';
import styles from './VerificationCard.module.css';

interface VerificationCardProps {
  organisation: any;
}

export function VerificationCard({ organisation }: VerificationCardProps) {
  const businessVerified = organisation.business_verified || false;
  const safeguardingCertified = organisation.safeguarding_certified || false;
  const professionalInsurance = organisation.professional_insurance || false;

  // Calculate DBS verification percentage
  const totalMembers = organisation.total_tutors || 0;
  const dbsVerifiedCount = organisation.dbs_verified_count || 0;
  const dbsPercentage = totalMembers > 0
    ? Math.round((dbsVerifiedCount / totalMembers) * 100)
    : 0;

  return (
    <div className={styles.card}>
      {/* Header with light teal background */}
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Verification</h3>
      </div>

      {/* Content wrapper for padding */}
      <div className={styles.verificationsContainer}>
        {/* Business Verified */}
        <div className={styles.verificationItem}>
          <span className={styles.label}>Business Verified</span>
          <div className={styles.statusContainer}>
            {businessVerified ? (
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

        {/* Safeguarding Certified */}
        <div className={styles.verificationItem}>
          <span className={styles.label}>Safeguarding Certified</span>
          <div className={styles.statusContainer}>
            {safeguardingCertified ? (
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

        {/* Professional Insurance */}
        <div className={styles.verificationItem}>
          <span className={styles.label}>Professional Insurance</span>
          <div className={styles.statusContainer}>
            {professionalInsurance ? (
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

        {/* DBS Check Percentage - Show only if some members are verified */}
        {dbsPercentage > 0 && (
          <div className={styles.verificationItem}>
            <span className={styles.label}>DBS Checked Team</span>
            <div className={styles.statusContainer}>
              {dbsPercentage === 100 ? (
                <>
                  <div className={`${styles.statusIcon} ${styles.verified}`}>
                    <Check size={16} strokeWidth={3} />
                  </div>
                  <span className={`${styles.statusText} ${styles.verified}`}>
                    100%
                  </span>
                </>
              ) : (
                <>
                  <div className={`${styles.statusIcon} ${styles.partial}`}>
                    <Check size={16} strokeWidth={3} />
                  </div>
                  <span className={`${styles.statusText} ${styles.partial}`}>
                    {dbsPercentage}%
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
