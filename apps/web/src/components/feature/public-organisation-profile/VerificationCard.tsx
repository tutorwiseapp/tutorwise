/**
 * Filename: VerificationCard.tsx
 * Purpose: Display organisation business verifications and credentials
 * Created: 2025-12-31
 */

'use client';

import { Shield, CheckCircle, Award, FileCheck, Users } from 'lucide-react';
import styles from './VerificationCard.module.css';

interface VerificationCardProps {
  organisation: any;
}

export function VerificationCard({ organisation }: VerificationCardProps) {
  // Calculate DBS verification percentage
  const totalMembers = organisation.total_tutors || 0;
  const dbsVerifiedCount = organisation.dbs_verified_count || 0;
  const dbsPercentage = totalMembers > 0
    ? Math.round((dbsVerifiedCount / totalMembers) * 100)
    : 0;

  // Check if organisation has any verifications to display
  const hasVerifications =
    organisation.business_verified ||
    organisation.safeguarding_certified ||
    organisation.professional_insurance ||
    organisation.association_membership ||
    dbsPercentage > 0;

  if (!hasVerifications) {
    return null;
  }

  return (
    <div className={styles.card}>
      {/* Header with light teal background */}
      <div className={styles.header}>
        <Shield className={styles.headerIcon} size={24} />
        <h2 className={styles.title}>Credentials & Trust</h2>
      </div>

      {/* Content wrapper for padding */}
      <div className={styles.verificationsContainer}>
        <div className={styles.verificationsList}>
        {/* Business Verified */}
        {organisation.business_verified && (
          <div className={styles.verificationItem}>
            <div className={styles.iconWrapper}>
              <CheckCircle className={styles.verifiedIcon} size={20} />
            </div>
            <div className={styles.verificationContent}>
              <div className={styles.verificationLabel}>Business Verified</div>
              <div className={styles.verificationDescription}>
                Official business credentials confirmed
              </div>
            </div>
          </div>
        )}

        {/* DBS Verification Percentage */}
        {dbsPercentage > 0 && (
          <div className={styles.verificationItem}>
            <div className={styles.iconWrapper}>
              <Shield className={styles.verifiedIcon} size={20} />
            </div>
            <div className={styles.verificationContent}>
              <div className={styles.verificationLabel}>
                {dbsPercentage}% DBS Checked
                {dbsPercentage === 100 && ' ✓'}
              </div>
              <div className={styles.verificationDescription}>
                {dbsVerifiedCount} of {totalMembers} team members
              </div>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${dbsPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Safeguarding Certification */}
        {organisation.safeguarding_certified && (
          <div className={styles.verificationItem}>
            <div className={styles.iconWrapper}>
              <Shield className={styles.verifiedIcon} size={20} />
            </div>
            <div className={styles.verificationContent}>
              <div className={styles.verificationLabel}>Safeguarding Certified</div>
              <div className={styles.verificationDescription}>
                Child protection policies in place
              </div>
            </div>
          </div>
        )}

        {/* Professional Insurance */}
        {organisation.professional_insurance && (
          <div className={styles.verificationItem}>
            <div className={styles.iconWrapper}>
              <FileCheck className={styles.verifiedIcon} size={20} />
            </div>
            <div className={styles.verificationContent}>
              <div className={styles.verificationLabel}>Professional Insurance</div>
              <div className={styles.verificationDescription}>
                Public liability coverage active
              </div>
            </div>
          </div>
        )}

        {/* Association Membership */}
        {organisation.association_membership && (
          <div className={styles.verificationItem}>
            <div className={styles.iconWrapper}>
              <Award className={styles.verifiedIcon} size={20} />
            </div>
            <div className={styles.verificationContent}>
              <div className={styles.verificationLabel}>Professional Association</div>
              <div className={styles.verificationDescription}>
                {organisation.association_membership}
              </div>
            </div>
          </div>
        )}

        {/* Total Clients Served (if significant) */}
        {organisation.total_clients > 50 && (
          <div className={styles.verificationItem}>
            <div className={styles.iconWrapper}>
              <Users className={styles.verifiedIcon} size={20} />
            </div>
            <div className={styles.verificationContent}>
              <div className={styles.verificationLabel}>
                {organisation.total_clients.toLocaleString()}+ Clients Served
              </div>
              <div className={styles.verificationDescription}>
                Established track record
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Trust Score Badge (if CaaS score is high) */}
        {organisation.caas_score && organisation.caas_score >= 80 && (
          <div className={styles.trustBadge}>
            <div className={styles.trustBadgeContent}>
              <div className={styles.trustBadgeIcon}>
                <Shield size={24} />
              </div>
              <div className={styles.trustBadgeText}>
                <div className={styles.trustBadgeTitle}>Highly Trusted</div>
                <div className={styles.trustBadgeSubtitle}>
                  {organisation.caas_score >= 90 ? 'Top 5%' : 'Top 10%'} rated organisation
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verification Footer */}
        <div className={styles.footer}>
          <p className={styles.footerText}>
            All credentials are independently verified by Tutorwise
          </p>
        </div>
      </div>
    </div>
  );
}
