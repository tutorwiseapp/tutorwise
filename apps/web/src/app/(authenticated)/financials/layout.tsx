/*
 * Filename: src/app/(authenticated)/financials/layout.tsx
 * Purpose: Financials layout with secondary tab navigation
 * Created: 2025-11-11
 * Specification: SDD v4.9 - Financials hub with Transactions/Payouts/Disputes tabs
 */
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './layout.module.css';

export default function FinancialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    { href: '/financials', label: 'Transactions', exact: true },
    { href: '/financials/payouts', label: 'Payouts' },
    { href: '/financials/disputes', label: 'Disputes' },
  ];

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.exact) {
      return pathname === tab.href;
    }
    return pathname?.startsWith(tab.href);
  };

  return (
    <div className={styles.financialsLayout}>
      {/* Page Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Financials</h1>
        <p className={styles.subtitle}>
          Track your earnings, payouts, and transaction history
        </p>
      </div>

      {/* Secondary Navigation Tabs */}
      <nav className={styles.secondaryNav}>
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tab} ${isActive(tab) ? styles.tabActive : ''}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* Tab Content */}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
