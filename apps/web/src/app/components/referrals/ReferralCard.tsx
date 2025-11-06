/*
 * Filename: src/app/components/referrals/ReferralCard.tsx
 * Purpose: Display referral lead information in card format (SDD v3.6)
 * Created: 2025-11-02
 * Updated: 2025-11-06 - Phase 5: Applied design system (SDD v4.3)
 * Specification: SDD v3.6, Section 4.3 - /referrals hub UI
 */
'use client';

import { Referral, ReferralStatus } from '@/types';
import Card from '@/app/components/ui/Card';
import styles from './ReferralCard.module.css';

interface ReferralCardProps {
  referral: Referral;
}

export default function ReferralCard({ referral }: ReferralCardProps) {
  // Format date/time
  const createdDate = new Date(referral.created_at);
  const formattedDate = createdDate.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const convertedDate = referral.converted_at
    ? new Date(referral.converted_at).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  // Status badge CSS class
  const getStatusClass = (status: ReferralStatus) => {
    switch (status) {
      case 'Converted':
        return styles.converted;
      case 'Signed Up':
        return styles.signedUp;
      case 'Expired':
        return styles.expired;
      case 'Referred':
      default:
        return styles.referred;
    }
  };

  // Get status description
  const getStatusDescription = (status: ReferralStatus) => {
    switch (status) {
      case 'Referred':
        return 'Link clicked, awaiting signup';
      case 'Signed Up':
        return 'User created account';
      case 'Converted':
        return 'First booking completed';
      case 'Expired':
        return 'Link expired (30 days)';
      default:
        return '';
    }
  };

  return (
    <Card className={styles.card}>
      <div className={styles.cardContent}>
        {/* Header: User Info + Status */}
        <div className={styles.header}>
          <div className={styles.userInfo}>
            {referral.referred_user ? (
              <div className={styles.userInfoWithAvatar}>
                {referral.referred_user.avatar_url && (
                  <img
                    src={referral.referred_user.avatar_url}
                    alt={referral.referred_user.full_name}
                    className={styles.avatar}
                  />
                )}
                <div>
                  <h3 className={styles.userName}>
                    {referral.referred_user.full_name}
                  </h3>
                  <p className={styles.userDescription}>
                    {getStatusDescription(referral.status)}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <h3 className={styles.userName}>
                  Anonymous Click
                </h3>
                <p className={styles.userDescription}>
                  {getStatusDescription(referral.status)}
                </p>
              </div>
            )}
          </div>
          <span className={`${styles.statusBadge} ${getStatusClass(referral.status)}`}>
            {referral.status}
          </span>
        </div>

        {/* Referral Details */}
        <div className={styles.detailsGrid}>
          <div>
            <span className={styles.detailLabel}>Referred:</span>{' '}
            <span className={styles.detailValue}>{formattedDate}</span>
          </div>
          {convertedDate && (
            <div>
              <span className={styles.detailLabel}>Converted:</span>{' '}
              <span className={styles.detailValue}>{convertedDate}</span>
            </div>
          )}
        </div>

        {/* Conversion Details (if applicable) */}
        {referral.status === 'Converted' && (
          <div className={styles.conversionSection}>
            <h4 className={styles.conversionTitle}>
              Conversion Details
            </h4>
            <div className={styles.conversionGrid}>
              {referral.first_booking && (
                <>
                  <div>
                    <span className={styles.conversionLabel}>Service:</span>{' '}
                    <span className={styles.conversionValue}>
                      {referral.first_booking.service_name}
                    </span>
                  </div>
                  <div>
                    <span className={styles.conversionLabel}>Booking Amount:</span>{' '}
                    <span className={styles.conversionValue}>
                      £{referral.first_booking.amount.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              {referral.first_commission && (
                <div className={styles.conversionGridFull}>
                  <span className={styles.conversionLabel}>Your Commission:</span>{' '}
                  <span className={styles.commissionValue}>
                    £{referral.first_commission.amount.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lead Funnel Progress Indicator */}
        <div className={styles.progressSection}>
          <div className={styles.progressTrack}>
            <div className={`${styles.progressStep} ${referral.status !== 'Referred' ? styles.active : ''}`}>
              <div className={`${styles.progressDot} ${referral.status !== 'Referred' ? styles.active : ''}`} />
              Referred
            </div>
            <div className={styles.progressLine} />
            <div className={`${styles.progressStep} ${referral.status === 'Signed Up' || referral.status === 'Converted' ? styles.active : ''}`}>
              <div className={`${styles.progressDot} ${referral.status === 'Signed Up' || referral.status === 'Converted' ? styles.active : ''}`} />
              Signed Up
            </div>
            <div className={styles.progressLine} />
            <div className={`${styles.progressStep} ${referral.status === 'Converted' ? styles.active : ''}`}>
              <div className={`${styles.progressDot} ${referral.status === 'Converted' ? styles.active : ''}`} />
              Converted
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
