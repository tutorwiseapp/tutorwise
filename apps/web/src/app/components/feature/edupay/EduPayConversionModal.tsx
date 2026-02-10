/**
 * Filename: EduPayConversionModal.tsx
 * Purpose: 3-step modal for converting EP to GBP via TrueLayer PISP
 * Created: 2026-02-10
 * Updated: 2026-02-10 — Migrated to HubComplexModal shell
 *
 * Step 1: Amount + destination selection
 * Step 2: Review + bank authorisation (or stub callout)
 * Step 3: Post-callback success confirmation
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '@/app/components/ui/actions/Button';
import { HubComplexModal } from '@/app/components/hub/modal';
import { EduPayWallet, requestConversion } from '@/lib/api/edupay';
import styles from './EduPayConversionModal.module.css';

type Destination = 'student_loan' | 'isa' | 'savings';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  wallet: EduPayWallet | null;
  onSuccess: () => void;
}

const DESTINATION_OPTIONS: { value: Destination; label: string; description: string }[] = [
  {
    value: 'student_loan',
    label: 'Student Loan',
    description: 'Pay directly toward your outstanding student loan balance',
  },
  {
    value: 'isa',
    label: 'ISA',
    description: 'Save into an Individual Savings Account',
  },
  {
    value: 'savings',
    label: 'Savings Account',
    description: 'Transfer to your personal savings account',
  },
];

const STEP_LABELS = ['Amount', 'Review', 'Done'];

export default function EduPayConversionModal({ isOpen, onClose, wallet, onSuccess }: Props) {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [epAmount, setEpAmount] = useState('');
  const [destination, setDestination] = useState<Destination>('student_loan');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stubMessage, setStubMessage] = useState<string | null>(null);

  // Show step 3 if redirected back from TrueLayer with ?conversion=success
  useEffect(() => {
    if (isOpen && searchParams?.get('conversion') === 'success') {
      setStep(3);
    }
  }, [isOpen, searchParams]);

  const availableEp = wallet?.available_ep ?? 0;
  const epNum = parseInt(epAmount, 10) || 0;
  const gbpPreview = (epNum / 100).toFixed(2);

  function handleClose() {
    setStep(1);
    setEpAmount('');
    setDestination('student_loan');
    setError(null);
    setStubMessage(null);
    onClose();
  }

  function handleMaxEp() {
    setEpAmount(String(availableEp));
  }

  async function handleAuthorise() {
    setError(null);
    setLoading(true);
    try {
      const result = await requestConversion({ ep_amount: epNum, destination });

      if (result.stub) {
        setStubMessage(
          result.message ??
            'TrueLayer credentials are not yet configured. Your conversion has been recorded.'
        );
      } else if (result.auth_url) {
        window.location.href = result.auth_url;
      } else {
        setStep(3);
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 1 footer ──────────────────────────────────────────────────────────
  const step1Footer = (
    <div className={styles.footerRow}>
      <Button variant="secondary" size="sm" onClick={handleClose}>
        Cancel
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={() => {
          if (!epNum || epNum <= 0) { setError('Enter a valid EP amount.'); return; }
          if (epNum > availableEp) { setError(`Max ${availableEp} EP available.`); return; }
          setError(null);
          setStep(2);
        }}
      >
        Review →
      </Button>
    </div>
  );

  // ── Step 2 footer ──────────────────────────────────────────────────────────
  const step2Footer = (
    <div className={styles.footerRow}>
      <Button variant="secondary" size="sm" onClick={() => { setStubMessage(null); setStep(1); }}>
        ← Back
      </Button>
      {!stubMessage ? (
        <Button
          variant="primary"
          size="sm"
          onClick={() => void handleAuthorise()}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Authorise with your bank'}
        </Button>
      ) : (
        <Button variant="primary" size="sm" onClick={handleClose}>
          Close
        </Button>
      )}
    </div>
  );

  // ── Step 3 footer ──────────────────────────────────────────────────────────
  const step3Footer = (
    <div className={styles.footerRow}>
      <Button variant="primary" size="sm" onClick={() => { handleClose(); onSuccess(); }}>
        Done
      </Button>
    </div>
  );

  const footerByStep = step === 1 ? step1Footer : step === 2 ? step2Footer : step3Footer;

  return (
    <HubComplexModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Convert EP to GBP"
      subtitle={`Available: ${availableEp.toLocaleString()} EP`}
      size="md"
      footer={footerByStep}
    >
      {/* Step progress bar */}
      <div className={styles.stepBar}>
        {STEP_LABELS.map((label, i) => {
          const s = i + 1;
          return (
            <React.Fragment key={s}>
              <div className={styles.stepItem}>
                <div
                  className={`${styles.stepCircle} ${step === s ? styles.stepCircleActive : ''} ${step > s ? styles.stepCircleDone : ''}`}
                >
                  {step > s ? '✓' : s}
                </div>
                <span className={`${styles.stepLabel} ${step === s ? styles.stepLabelActive : ''}`}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`${styles.stepConnector} ${step > s ? styles.stepConnectorDone : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Step 1: Amount + destination ──────────────────────────────────── */}
      {step === 1 && (
        <div className={styles.body}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Amount</h3>
            <div className={styles.fieldsGrid}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>EP Amount</span>
                <div className={styles.amountRow}>
                  <input
                    type="number"
                    min={1}
                    max={availableEp}
                    value={epAmount}
                    onChange={e => setEpAmount(e.target.value)}
                    className={styles.input}
                    placeholder="e.g. 500"
                    autoFocus
                  />
                  <button className={styles.maxBtn} onClick={handleMaxEp} type="button">
                    Max
                  </button>
                </div>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>GBP Value</span>
                <div className={`${styles.gbpReadonly} ${epNum > 0 ? styles.gbpReadonlyActive : ''}`}>
                  {epNum > 0 ? `£${gbpPreview}` : '£0.00'}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Destination</h3>
            <div className={styles.destinationCards}>
              {DESTINATION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.destCard} ${destination === opt.value ? styles.destCardActive : ''}`}
                  onClick={() => setDestination(opt.value)}
                >
                  <span className={styles.destLabel}>{opt.label}</span>
                  <span className={styles.destDesc}>{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}
        </div>
      )}

      {/* ── Step 2: Review + authorise ────────────────────────────────────── */}
      {step === 2 && (
        <div className={styles.body}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Review</h3>
            <div className={styles.fieldsGrid}>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>EP Amount</span>
                <span className={styles.fieldValue}>{epNum.toLocaleString()} EP</span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>GBP Value</span>
                <span className={styles.fieldValue}>£{gbpPreview}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Destination</span>
                <span className={styles.fieldValue}>
                  {DESTINATION_OPTIONS.find(o => o.value === destination)?.label}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Rate</span>
                <span className={styles.fieldValue}>100 EP = £1.00</span>
              </div>
            </div>
          </div>

          {stubMessage ? (
            <div className={styles.stubCallout}>
              <p className={styles.stubTitle}>Integration Pending</p>
              <p className={styles.stubText}>{stubMessage}</p>
              <p className={styles.stubText}>
                Open Banking via TrueLayer will be enabled once partner onboarding is complete.
              </p>
            </div>
          ) : (
            <div className={styles.infoCallout}>
              <p className={styles.infoText}>
                You will be redirected to your bank to authorise this payment securely via Open Banking (TrueLayer).
              </p>
            </div>
          )}

          {error && <p className={styles.errorMsg}>{error}</p>}
        </div>
      )}

      {/* ── Step 3: Success ───────────────────────────────────────────────── */}
      {step === 3 && (
        <div className={styles.body}>
          <div className={styles.successBlock}>
            <div className={styles.successIcon}>✓</div>
            <h3 className={styles.successTitle}>Payment Authorised</h3>
            <p className={styles.successText}>
              Your bank has authorised the payment. The transfer is now being processed and your EP
              balance will update once it completes (typically 1–3 business days).
            </p>
          </div>
        </div>
      )}
    </HubComplexModal>
  );
}
