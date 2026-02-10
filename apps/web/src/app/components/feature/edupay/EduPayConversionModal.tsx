/**
 * Filename: EduPayConversionModal.tsx
 * Purpose: 3-step modal for converting EP to GBP via TrueLayer PISP
 * Created: 2026-02-10
 *
 * Step 1: Amount + destination selection
 * Step 2: Review + bank authorisation (or stub callout)
 * Step 3: Post-callback success confirmation
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '@/app/components/ui/actions/Button';
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
    if (!epNum || epNum <= 0) {
      setError('Please enter a valid EP amount.');
      return;
    }
    if (epNum > availableEp) {
      setError(`You only have ${availableEp} EP available.`);
      return;
    }

    setLoading(true);
    try {
      const result = await requestConversion({ ep_amount: epNum, destination });

      if (result.stub) {
        setStubMessage(
          result.message ??
            'TrueLayer credentials are not yet configured. Your conversion has been recorded.'
        );
        // Stay on step 2 to show the stub callout
      } else if (result.auth_url) {
        // Redirect to TrueLayer hosted payment page
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

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Convert EP to GBP</h2>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Step indicator */}
        <div className={styles.steps}>
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`${styles.stepDot} ${step === s ? styles.stepDotActive : ''} ${step > s ? styles.stepDotDone : ''}`}
            />
          ))}
        </div>

        {/* Step 1: Amount + destination */}
        {step === 1 && (
          <div className={styles.body}>
            <p className={styles.subtitle}>
              Available EP: <strong>{availableEp.toLocaleString()} EP</strong>
            </p>

            <label className={styles.label}>Amount (EP)</label>
            <div className={styles.amountRow}>
              <input
                type="number"
                min={1}
                max={availableEp}
                value={epAmount}
                onChange={e => setEpAmount(e.target.value)}
                className={styles.input}
                placeholder="e.g. 500"
              />
              <button className={styles.maxBtn} onClick={handleMaxEp} type="button">
                Max
              </button>
            </div>
            {epNum > 0 && (
              <p className={styles.preview}>≈ £{gbpPreview}</p>
            )}

            <label className={styles.label} style={{ marginTop: '1.25rem' }}>Destination</label>
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

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.footer}>
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
          </div>
        )}

        {/* Step 2: Review + authorise */}
        {step === 2 && (
          <div className={styles.body}>
            <div className={styles.reviewCard}>
              <div className={styles.reviewRow}>
                <span>EP Amount</span>
                <strong>{epNum.toLocaleString()} EP</strong>
              </div>
              <div className={styles.reviewRow}>
                <span>GBP Value</span>
                <strong>£{gbpPreview}</strong>
              </div>
              <div className={styles.reviewRow}>
                <span>Destination</span>
                <strong>{DESTINATION_OPTIONS.find(o => o.value === destination)?.label}</strong>
              </div>
            </div>

            {stubMessage ? (
              <div className={styles.stubCallout}>
                <p className={styles.stubTitle}>Integration Pending</p>
                <p className={styles.stubText}>{stubMessage}</p>
                <p className={styles.stubText} style={{ marginTop: '0.5rem' }}>
                  Open Banking via TrueLayer will be enabled once partner onboarding is complete.
                </p>
              </div>
            ) : (
              <p className={styles.authoriseNote}>
                You will be redirected to your bank to authorise this payment securely via Open Banking (TrueLayer).
              </p>
            )}

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.footer}>
              <Button variant="secondary" size="sm" onClick={() => { setStubMessage(null); setStep(1); }}>
                ← Back
              </Button>
              {!stubMessage && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void handleAuthorise()}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Authorise with your bank'}
                </Button>
              )}
              {stubMessage && (
                <Button variant="primary" size="sm" onClick={handleClose}>
                  Close
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className={styles.body}>
            <div className={styles.successIcon}>✓</div>
            <h3 className={styles.successTitle}>Payment Authorised</h3>
            <p className={styles.successText}>
              Your bank has authorised the payment. The transfer is now being processed and your EP
              balance will update once it completes (typically 1–3 business days).
            </p>
            <div className={styles.footer}>
              <Button variant="primary" size="sm" onClick={() => { handleClose(); onSuccess(); }}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
