/*
 * Filename: src/app/(admin)/admin/referrals/page.tsx
 * Purpose: Admin Referrals overview page (Placeholder)
 * Created: 2025-12-26
 * Phase: 2 - Platform Management
 * Status: Under Development
 */
'use client';

import React from 'react';
import Link from 'next/link';
import HubPageLayout from '@/app/components/hub/layout/HubPageLayout';
import HubHeader from '@/app/components/hub/layout/HubHeader';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import styles from './page.module.css';

// Force dynamic rendering (no SSR/SSG) for admin pages
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function AdminReferralsPage() {
  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Referrals (Admin)"
          subtitle="Platform referral management"
        />
      }
    >
      <div className={styles.placeholderContainer}>
        <div className={styles.placeholderCard}>
          <AlertCircle className={styles.icon} size={48} />
          <h2 className={styles.title}>Admin Referrals - Under Development</h2>
          <p className={styles.description}>
            This admin feature is currently under development. The admin referrals
            management system will allow you to view and manage all platform referrals,
            track referral performance, and manage referral programs.
          </p>
          <Link href="/admin" className={styles.backLink}>
            <ArrowLeft size={16} />
            Back to Admin Dashboard
          </Link>
        </div>
      </div>
    </HubPageLayout>
  );
}
