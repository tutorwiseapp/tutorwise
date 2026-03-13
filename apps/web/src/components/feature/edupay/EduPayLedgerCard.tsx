/**
 * Filename: EduPayLedgerCard.tsx
 * Purpose: Individual EP ledger entry card — consistent with financials TransactionCard visual language
 * Created: 2026-02-10
 * Design: design-system.md — border: 1px solid #e5e7eb, border-radius: 8px, padding: 1rem 1.25rem
 */

'use client';

import React from 'react';
import styles from './EduPayLedgerCard.module.css';
import type { EduPayLedgerEntry } from '@/lib/api/edupay';

interface EduPayLedgerCardProps {
  entry: EduPayLedgerEntry;
}

const TYPE_LABELS: Record<string, string> = {
  earn: 'Earned',
  convert: 'Converted',
  bonus: 'Bonus',
  expire: 'Expired',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  tutoring_income: 'Tutoring Income',
  referral_income: 'Referral Bonus',
  affiliate_spend: 'Affiliate Reward',
  gift_reward: 'Gift Reward',
  caas_threshold: 'CaaS Reward',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function EduPayLedgerCard({ entry }: EduPayLedgerCardProps) {
  const description = entry.note
    || (entry.event_type ? EVENT_TYPE_LABELS[entry.event_type] : null)
    || TYPE_LABELS[entry.type]
    || 'EP Activity';

  const isCredit = entry.type === 'earn' || entry.type === 'bonus';
  const gbpValue = entry.ep_amount / 100;

  return (
    <div className={styles.card}>
      <div className={styles.left}>
        <span className={`${styles.badge} ${styles[`badge_${entry.type}`]}`}>
          {TYPE_LABELS[entry.type] ?? entry.type}
        </span>
        <span className={styles.description}>{description}</span>
      </div>

      <div className={styles.right}>
        <span className={`${styles.epAmount} ${isCredit ? styles.epCredit : styles.epDebit}`}>
          {isCredit ? '+' : '-'}{entry.ep_amount.toLocaleString()} EP
        </span>
        <span className={styles.gbpValue}>
          £{gbpValue.toFixed(2)}
        </span>
      </div>

      <div className={styles.meta}>
        <span className={styles.date}>{formatDate(entry.created_at)}</span>
        <span className={`${styles.statusDot} ${styles[`dot_${entry.status}`]}`} />
        <span className={styles.statusLabel}>{entry.status}</span>
        {entry.available_at && entry.status === 'pending' && (
          <span className={styles.availableDate}>
            · available {formatDate(entry.available_at)}
          </span>
        )}
      </div>
    </div>
  );
}
