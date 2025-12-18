/**
 * Filename: apps/web/src/app/components/referrals/ReferralStatsWidget.tsx
 * Purpose: Referral statistics widget using HubStatsCard shell
 * Created: 2025-11-18
 * Updated: 2025-12-07 - Added Total Earned metric and commission breakdown
 * Design: context-sidebar-ui-design-v2.md Section 2.4
 *
 * Pattern: Uses HubStatsCard shell (same as NetworkStatsWidget)
 * Stats Shown:
 * - Referred
 * - Signed Up
 * - Converted
 * - Total Earned (with link to /payments)
 * - Commission Breakdown (expandable)
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import HubStatsCard, { StatRow } from '@/app/components/hub/sidebar/cards/HubStatsCard';
import styles from './ReferralStatsWidget.module.css';

interface CommissionBreakdown {
  referred: number;
  signedUp: number;
  converted: number;
}
interface ReferralStatsWidgetProps {
  totalReferred: number;
  signedUp: number;
  converted: number;
  totalEarned: number;
  breakdown?: CommissionBreakdown;
}

export default function ReferralStatsWidget({
  totalReferred,
  signedUp,
  converted,
  totalEarned,
  breakdown,
}: ReferralStatsWidgetProps) {
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);

  // Build stats rows following design spec (Section 2.4)
  const statsRows = [
    {
      label: 'Referred',
      value: totalReferred,
      valueColor: 'default' as const,
      isLink: false,
    },
    {
      label: 'Signed Up',
      value: signedUp,
      valueColor: 'default' as const,
      isLink: false,
    },
    {
      label: 'Converted',
      value: converted,
      valueColor: 'default' as const,
      isLink: false,
    },
    {
      label: 'Total Earned',
      value: `£${totalEarned.toFixed(2)}`,
      valueColor: 'green' as const,
      isLink: true,
      linkHref: '/payments',
    },
  ];

  // If no breakdown, use standard HubStatsCard
  if (!breakdown) {
    return (
      <HubStatsCard
        title="Referral Stats"
        stats={statsRows}
      />
    );
  }

  // Custom card with breakdown section to blend seamlessly
  return (
    <div className={styles.statsWidget}>
      <h3 className={styles.title}>Referral Stats</h3>

      {/* Stats rows */}
      <div className={styles.statsContainer}>
        {statsRows.map((stat, index) => (
          <div key={index} className={styles.statRow}>
            <span className={styles.label}>{stat.label}</span>
            {stat.isLink && stat.linkHref ? (
              <Link
                href={stat.linkHref}
                className={`${styles.value} ${styles[stat.valueColor]}`}
                style={{ textDecoration: 'underline' }}
              >
                {stat.value}
              </Link>
            ) : (
              <span className={`${styles.value} ${styles[stat.valueColor]}`}>
                {stat.value}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Commission Breakdown Section */}
      <div className={styles.breakdownSection}>
        <div
          className={styles.breakdownHeader}
          onClick={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
          role="button"
          tabIndex={0}
          aria-expanded={isBreakdownExpanded}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsBreakdownExpanded(!isBreakdownExpanded);
            }
          }}
        >
          <span className={styles.breakdownTitle}>Commission Breakdown</span>
          <span className={`${styles.expandIcon} ${isBreakdownExpanded ? styles.expanded : ''}`}>
            ▼
          </span>
        </div>

        {isBreakdownExpanded && (
          <div className={styles.breakdownContent}>
            <div className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>Referred</span>
              <span className={styles.breakdownValue}>£{breakdown.referred.toFixed(2)}</span>
            </div>
            <div className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>Signed Up</span>
              <span className={styles.breakdownValue}>£{breakdown.signedUp.toFixed(2)}</span>
            </div>
            <div className={styles.breakdownRow}>
              <span className={styles.breakdownLabel}>Converted</span>
              <span className={styles.breakdownValue}>£{breakdown.converted.toFixed(2)}</span>
            </div>
            <div className={styles.breakdownTotal}>
              <span className={styles.breakdownTotalLabel}>Total</span>
              <span className={styles.breakdownTotalValue}>£{totalEarned.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Delegation Settings Button */}
      <Link href="/account/referrals/settings" className={styles.settingsButton}>
        <Settings className={styles.settingsIcon} size={16} />
        <span>Delegation Settings</span>
      </Link>
    </div>
  );
}
