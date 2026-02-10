/**
 * Filename: EduPayLoanProfileModal.tsx
 * Purpose: Modal form for creating or editing a student loan profile
 * Created: 2026-02-10
 * Updated: 2026-02-10 — Migrated to HubComplexModal shell
 *
 * Props: { isOpen, onClose, loanProfile (null = create), onSave }
 * Saves via POST /api/edupay/loan-profile and calls onSave() for refetch.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Button from '@/app/components/ui/actions/Button';
import { HubComplexModal } from '@/app/components/hub/modal';
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
  const [slcReference, setSlcReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from existing profile
  useEffect(() => {
    if (loanProfile) {
      setLoanPlan(loanProfile.loan_plan);
      setEstimatedBalance(String(loanProfile.estimated_balance));
      setAnnualSalary(String(loanProfile.annual_salary));
      setGraduationYear(String(loanProfile.graduation_year));
      setSlcReference(loanProfile.slc_reference ?? '');
    } else {
      setLoanPlan('plan2');
      setEstimatedBalance('');
      setAnnualSalary('');
      setGraduationYear(String(new Date().getFullYear()));
      setSlcReference('');
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
        slc_reference: slcReference.trim() || null,
      });
      onSave();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save loan profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const isEditing = !!loanProfile;

  const footer = (
    <div className={styles.footerRow}>
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
  );

  return (
    <HubComplexModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Loan Profile' : 'Set Up Loan Profile'}
      subtitle="Used to calculate your projected debt-free date using EduPay points"
      size="md"
      footer={footer}
      isLoading={loading}
      loadingText="Saving profile..."
    >
      <div className={styles.body}>
        {/* Loan Plan */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Loan Plan</h3>
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
        </div>

        {/* Numeric fields */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Financial Details</h3>
          <div className={styles.fieldsGrid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="lp-balance">
                Estimated Balance (£)
              </label>
              <input
                id="lp-balance"
                type="number"
                min={0}
                step={100}
                value={estimatedBalance}
                onChange={e => setEstimatedBalance(e.target.value)}
                className={styles.input}
                placeholder="e.g. 45000"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="lp-salary">
                Current Annual Salary (£)
              </label>
              <input
                id="lp-salary"
                type="number"
                min={0}
                step={1000}
                value={annualSalary}
                onChange={e => setAnnualSalary(e.target.value)}
                className={styles.input}
                placeholder="e.g. 28000"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="lp-year">
                Graduation Year
              </label>
              <input
                id="lp-year"
                type="number"
                min={1990}
                max={new Date().getFullYear() + 10}
                value={graduationYear}
                onChange={e => setGraduationYear(e.target.value)}
                className={styles.input}
                placeholder={String(new Date().getFullYear())}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="lp-slc-ref">
                SLC Customer Reference (optional)
              </label>
              <input
                id="lp-slc-ref"
                type="text"
                value={slcReference}
                onChange={e => setSlcReference(e.target.value)}
                className={styles.input}
                placeholder="e.g. 5710044563"
                maxLength={20}
              />
            </div>
          </div>
        </div>

        {error && <p className={styles.errorMsg}>{error}</p>}
      </div>
    </HubComplexModal>
  );
}
