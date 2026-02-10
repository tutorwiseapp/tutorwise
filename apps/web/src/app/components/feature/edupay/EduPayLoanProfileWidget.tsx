/**
 * Filename: EduPayLoanProfileWidget.tsx
 * Purpose: EduPay loan profile display sidebar widget
 * Created: 2026-02-10
 * Shell: HubComplexCard
 */

'use client';

import React from 'react';
import HubComplexCard from '@/app/components/hub/sidebar/cards/HubComplexCard';
import styles from './EduPayLoanProfileWidget.module.css';
import type { EduPayLoanProfile } from '@/lib/api/edupay';

interface EduPayLoanProfileWidgetProps {
  loanProfile: EduPayLoanProfile | null;
}

const LOAN_PLAN_LABELS: Record<string, string> = {
  plan1: 'Plan 1',
  plan2: 'Plan 2',
  plan5: 'Plan 5',
  postgrad: 'Postgraduate',
};

export default function EduPayLoanProfileWidget({ loanProfile }: EduPayLoanProfileWidgetProps) {
  return (
    <HubComplexCard>
      <h3 className={styles.title}>Loan Profile</h3>
      <div className={styles.content}>
        {!loanProfile ? (
          <p className={styles.emptyText}>
            Add your loan details to unlock impact projections.
          </p>
        ) : (
          <>
            <div className={styles.row}>
              <span className={styles.label}>Loan Plan</span>
              <span className={styles.value}>{LOAN_PLAN_LABELS[loanProfile.loan_plan] ?? loanProfile.loan_plan}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Est. Balance</span>
              <span className={styles.value}>£{loanProfile.estimated_balance.toLocaleString()}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Annual Salary</span>
              <span className={styles.value}>£{loanProfile.annual_salary.toLocaleString()}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Graduation</span>
              <span className={styles.value}>{loanProfile.graduation_year}</span>
            </div>
          </>
        )}
      </div>
    </HubComplexCard>
  );
}
