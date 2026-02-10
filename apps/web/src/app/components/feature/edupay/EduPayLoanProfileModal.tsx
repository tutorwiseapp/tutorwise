/**
 * Filename: EduPayLoanProfileModal.tsx
 * Purpose: Modal form for creating or editing a student loan profile
 * Created: 2026-02-10
 *
 * Props: { isOpen, onClose, loanProfile (null = create), onSave }
 * Saves via POST /api/edupay/loan-profile and calls onSave() for refetch.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Button from '@/app/components/ui/actions/Button';
import { EduPayLoanProfile, saveLoanProfile } from '@/lib/api/edupay';
import styles from './EduPayLoanProfileModal.module.css';

type LoanPlan = 'plan1' | 'plan2' | 'plan5' | 'postgrad';

const LOAN_PLAN_OPTIONS: { value: LoanPlan; label: string; description: string }[] = [
  { value: 'plan1', label: 'Plan 1', description: 'Started before Sept 2012 (England/Wales) or any date (Scotland/NI)' },
  { value: 'plan2', label: 'Plan 2', description: 'Started on or after Sept 2012 in England or Wales' },
  { value: 'plan5', label: 'Plan 5', description: 'New undergraduate loans from Aug 2023 onwards (England)' },
  { value: 'postgrad', label: 'Postgraduate', description: "Postgraduate Master's or Doctoral loan" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  loanProfile: EduPayLoanProfile | null;
  onSave: () => void;
}

export default function EduPayLoanProfileModal({ isOpen, onClose, loanProfile, onSave }: Props) {
  const [loanPlan, setLoanPlan] = useState<LoanPlan>('plan2');
  const [estimatedBalance, setEstimatedBalance] = useState('');
  const [annualSalary, setAnnualSalary] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from existing profile
  useEffect(() => {
    if (loanProfile) {
      setLoanPlan(loanProfile.loan_plan);
      setEstimatedBalance(String(loanProfile.estimated_balance));
      setAnnualSalary(String(loanProfile.annual_salary));
      setGraduationYear(String(loanProfile.graduation_year));
    } else {
      setLoanPlan('plan2');
      setEstimatedBalance('');
      setAnnualSalary('');
      setGraduationYear(String(new Date().getFullYear()));
    }
    setError(null);
  }, [loanProfile, isOpen]);

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleSave() {
    setError(null);

    const balance = parseFloat(estimatedBalance);
    const salary = parseFloat(annualSalary);
    const year = parseInt(graduationYear, 10);
    const currentYear = new Date().getFullYear();

    if (!balance || balance <= 0) {
      setError('Please enter a valid estimated balance.');
      return;
    }
    if (!salary || salary < 0) {
      setError('Please enter a valid annual salary.');
      return;
    }
    if (!year || year < 1990 || year > currentYear + 10) {
      setError('Please enter a valid graduation year.');
      return;
    }

    setLoading(true);
    try {
      await saveLoanProfile({
        loan_plan: loanPlan,
        estimated_balance: balance,
        annual_salary: salary,
        graduation_year: year,
      });
      onSave();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save loan profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const isEditing = !!loanProfile;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>{isEditing ? 'Edit Loan Profile' : 'Set Up Loan Profile'}</h2>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.intro}>
            Your loan profile is used to calculate how much sooner you could clear your student debt
            using EduPay points.
          </p>

          {/* Loan Plan */}
          <label className={styles.label}>Loan Plan</label>
          <div className={styles.planCards}>
            {LOAN_PLAN_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`${styles.planCard} ${loanPlan === opt.value ? styles.planCardActive : ''}`}
                onClick={() => setLoanPlan(opt.value)}
              >
                <span className={styles.planLabel}>{opt.label}</span>
                <span className={styles.planDesc}>{opt.description}</span>
              </button>
            ))}
          </div>

          {/* Estimated Balance */}
          <label className={styles.label}>Estimated Balance (£)</label>
          <input
            type="number"
            min={0}
            step={100}
            value={estimatedBalance}
            onChange={e => setEstimatedBalance(e.target.value)}
            className={styles.input}
            placeholder="e.g. 45000"
          />

          {/* Annual Salary */}
          <label className={styles.label}>Current Annual Salary (£)</label>
          <input
            type="number"
            min={0}
            step={1000}
            value={annualSalary}
            onChange={e => setAnnualSalary(e.target.value)}
            className={styles.input}
            placeholder="e.g. 28000"
          />

          {/* Graduation Year */}
          <label className={styles.label}>Graduation Year</label>
          <input
            type="number"
            min={1990}
            max={new Date().getFullYear() + 10}
            value={graduationYear}
            onChange={e => setGraduationYear(e.target.value)}
            className={styles.input}
            placeholder={String(new Date().getFullYear())}
          />

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.footer}>
            <Button variant="secondary" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleSave()}
              disabled={loading}
            >
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Profile'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
