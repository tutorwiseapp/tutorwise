/**
 * Filename: CancellationPolicyCard.tsx
 * Purpose: Display listing cancellation policy with visual indicators
 * Created: 2025-12-09
 */

import type { ListingV41 } from '@/types/listing-v4.1';
import Card from '@/app/components/ui/data-display/Card';
import styles from './CancellationPolicyCard.module.css';

interface CancellationPolicyCardProps {
  listing: ListingV41;
}

export function CancellationPolicyCard({ listing }: CancellationPolicyCardProps) {
  // If no cancellation policy, show empty state
  if (!listing.cancellation_policy) {
    return null; // Don't show card if no policy exists
  }

  // Default cancellation policy structure if custom text provided
  const defaultPolicies = [
    {
      icon: '✓',
      iconColor: '#10b981', // green
      text: 'Free cancellation up to 24 hours before the session starts.',
    },
    {
      icon: '💰',
      iconColor: '#f59e0b', // amber
      text: 'Full refund if you cancel within the free cancellation period.',
    },
    {
      icon: '⚠️',
      iconColor: '#ef4444', // red
      text: '50% refund if you cancel within 24 hours of the session.',
    },
    {
      icon: '✕',
      iconColor: '#6b7280', // gray
      text: 'No refund if you cancel after the session has started.',
    },
  ];

  return (
    <Card className={styles.policyCard}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Cancellation Policy</h2>
      </div>

      {/* Custom policy text if provided */}
      {listing.cancellation_policy && (
        <div className={styles.customPolicy}>
          <p className={styles.policyText}>{listing.cancellation_policy}</p>
        </div>
      )}

      {/* Standard policy points */}
      <div className={styles.policyList}>
        {defaultPolicies.map((policy, index) => (
          <div key={index} className={styles.policyItem}>
            <div className={styles.iconWrapper} style={{ color: policy.iconColor }}>
              <span className={styles.icon}>{policy.icon}</span>
            </div>
            <p className={styles.policyItemText}>{policy.text}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
