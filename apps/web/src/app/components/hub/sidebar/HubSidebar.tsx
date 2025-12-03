/*
 * Filename: src/app/components/hub/sidebar/HubSidebar.tsx
 * Purpose: Hub-specific hub sidebar (right column in 3-column layout)
 * Created: 2025-11-02
 * Specification: SDD v3.6, Section 5.2 - HubSidebar (hub-specific cards)
 */
'use client';

import React from 'react';
import styles from './HubSidebar.module.css';

interface HubSidebarProps {
  children: React.ReactNode;
}

export default function HubSidebar({ children }: HubSidebarProps) {
  return (
    <aside className={styles.hubSidebar}>
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

// Bookings Hub Card

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
// Note: ReferralStatsWidget moved to components/referrals/ReferralStatsWidget.tsx

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
