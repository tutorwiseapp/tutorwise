/**
 * Filename: EduPayProjectionWidget.tsx
 * Purpose: EduPay loan impact projection sidebar widget
 * Created: 2026-02-10
 * Shell: HubComplexCard
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './EduPayProjectionWidget.module.css';
import type { EduPayWallet, EduPayProjection, EduPayLoanProfile } from '@/lib/api/edupay';

interface EduPayProjectionWidgetProps {
  loanProfile: EduPayLoanProfile | null;
  wallet: EduPayWallet | null;
  projection: EduPayProjection | null;
}

const LOAN_PLAN_LABELS: Record<string, string> = {
  plan1: 'Plan 1',
  plan2: 'Plan 2',
  plan5: 'Plan 5',
  postgrad: 'Postgraduate',
};

export default function EduPayProjectionWidget({
  loanProfile,
  wallet,
  projection,
}: EduPayProjectionWidgetProps) {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Loan Impact</h3>
      <div className={styles.content}>
        {!loanProfile ? (
          <p className={styles.emptyText}>
            Set up your loan profile to see how your EP reduces your student debt.
          </p>
        ) : projection ? (
          <>
            <div className={styles.impactRow}>
              <span className={styles.impactNumber}>{projection.years_earlier.toFixed(1)}</span>
              <span className={styles.impactLabel}>years earlier debt-free</span>
            </div>
            <div className={styles.savedRow}>
              <span className={styles.savedAmount}>£{projection.interest_saved_gbp.toLocaleString()}</span>
              <span className={styles.savedLabel}>projected interest saved</span>
            </div>
            <div className={styles.divider} />
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>EP earned</span>
              <span className={styles.summaryValue}>{(wallet?.total_ep ?? 0).toLocaleString()} EP</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Converted to loan</span>
              <span className={styles.summaryValue}>£{((wallet?.converted_ep ?? 0) / 100).toFixed(2)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Loan plan</span>
              <span className={styles.summaryValue}>{LOAN_PLAN_LABELS[loanProfile.loan_plan] ?? loanProfile.loan_plan}</span>
            </div>
          </>
        ) : (
          <>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>EP earned</span>
              <span className={styles.summaryValue}>{(wallet?.total_ep ?? 0).toLocaleString()} EP</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Available</span>
              <span className={styles.summaryValue}>{(wallet?.available_ep ?? 0).toLocaleString()} EP</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Loan plan</span>
              <span className={styles.summaryValue}>{LOAN_PLAN_LABELS[loanProfile.loan_plan] ?? loanProfile.loan_plan}</span>
            </div>
            <p className={styles.noteText}>
              Earn more EP to unlock loan projections.
            </p>
          </>
        )}
      </div>
    </HubComplexCard>
  );
}
