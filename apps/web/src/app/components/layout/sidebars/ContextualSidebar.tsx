/*
 * Filename: src/app/components/layout/sidebars/ContextualSidebar.tsx
 * Purpose: Hub-specific contextual sidebar (right column in 3-column layout)
 * Created: 2025-11-02
 * Specification: SDD v3.6, Section 5.2 - ContextualSidebar (hub-specific widgets)
 */
'use client';

import React from 'react';
import styles from './ContextualSidebar.module.css';

interface ContextualSidebarProps {
  children: React.ReactNode;
}

export default function ContextualSidebar({ children }: ContextualSidebarProps) {
  return (
    <aside className={styles.contextualSidebar}>
      <div className={styles.sidebarContent}>{children}</div>
    </aside>
  );
}

// Widget components for different hubs

interface WidgetProps {
  title: string;
  children: React.ReactNode;
}

export function SidebarWidget({ title, children }: WidgetProps) {
  return (
    <div className={styles.widget}>
      <h3 className={styles.widgetTitle}>{title}</h3>
      <div className={styles.widgetContent}>{children}</div>
    </div>
  );
}

// Bookings Hub Widgets

interface UpcomingSessionProps {
  date: string;
  time: string;
  service: string;
  participant: string;
}

export function UpcomingSessionWidget({ date, time, service, participant }: UpcomingSessionProps) {
  return (
    <SidebarWidget title="Next Session">
      <div className={styles.sessionCard}>
        <div className={styles.sessionDate}>
          <span>{date}</span>
        </div>
        <div className={styles.sessionTime}>
          <span>{time}</span>
        </div>
        <div className={styles.sessionService}>{service}</div>
        <div className={styles.sessionParticipant}>{participant}</div>
      </div>
    </SidebarWidget>
  );
}

// Financials Hub Widgets

interface BalanceSummaryProps {
  available: number;
  pending: number;
  total: number;
}

export function BalanceSummaryWidget({ available, pending, total }: BalanceSummaryProps) {
  return (
    <SidebarWidget title="Balance Summary">
      <div className={styles.balanceCard}>
        <div className={styles.balanceRow}>
          <span className={styles.balanceLabel}>Available:</span>
          <span className={styles.balanceAmount}>£{available.toFixed(2)}</span>
        </div>
        <div className={styles.balanceRow}>
          <span className={styles.balanceLabel}>Pending:</span>
          <span className={styles.balancePending}>£{pending.toFixed(2)}</span>
        </div>
        <div className={`${styles.balanceRow} ${styles.balanceTotal}`}>
          <span className={styles.balanceLabel}>Total:</span>
          <span className={styles.balanceAmountTotal}>£{total.toFixed(2)}</span>
        </div>
      </div>
    </SidebarWidget>
  );
}

// Referrals Hub Widgets

interface ReferralStatsProps {
  totalReferred: number;
  signedUp: number;
  converted: number;
  totalEarned: number;
}

export function ReferralStatsWidget({
  totalReferred,
  signedUp,
  converted,
  totalEarned,
}: ReferralStatsProps) {
  return (
    <SidebarWidget title="Referral Stats">
      <div className={styles.statsCard}>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Referred:</span>
          <span className={styles.statValue}>{totalReferred}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Signed Up:</span>
          <span className={styles.statValue}>{signedUp}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Converted:</span>
          <span className={styles.statValue}>{converted}</span>
        </div>
        <div className={`${styles.statRow} ${styles.statHighlight}`}>
          <span className={styles.statLabel}>Total Earned:</span>
          <span className={styles.statValueHighlight}>£{totalEarned.toFixed(2)}</span>
        </div>
      </div>
    </SidebarWidget>
  );
}

interface ReferralLinkProps {
  referralCode: string;
  onCopy: () => void;
}

export function ReferralLinkWidget({ referralCode, onCopy }: ReferralLinkProps) {
  const referralUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/a/${referralCode}`;

  return (
    <SidebarWidget title="Your Referral Link">
      <div className={styles.referralLinkCard}>
        <div className={styles.referralUrl}>{referralUrl}</div>
        <button onClick={onCopy} className={styles.copyButton}>
          Copy Link
        </button>
      </div>
    </SidebarWidget>
  );
}
