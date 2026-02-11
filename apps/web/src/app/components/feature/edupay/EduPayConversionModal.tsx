/**
 * Filename: EduPayConversionModal.tsx
 * Purpose: 3-step modal for converting EP to GBP via TrueLayer PISP or ISA/Savings
 * Created: 2026-02-10
 * Updated: 2026-02-11 — Added ISA/Savings provider linking and interest projections
 *
 * Step 1: Amount + destination selection (+ provider linking for ISA/Savings)
 * Step 2: Review + bank authorisation (or allocation confirmation)
 * Step 3: Success confirmation
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '@/app/components/ui/actions/Button';
import { HubComplexModal } from '@/app/components/hub/modal';
import {
  EduPayWallet,
  EduPayLoanProfile,
  requestConversion,
  LinkedAccount,
  getLinkedAccounts,
  linkAccount,
} from '@/lib/api/edupay';
import {
  SAVINGS_PROVIDERS,
  getProvidersByType,
  calculateInterest,
  projectSavingsGrowth,
  formatGBP,
  type SavingsProvider,
  type ProviderType,
} from '@/lib/edupay/savings-providers';
import styles from './EduPayConversionModal.module.css';

type Destination = 'student_loan' | 'isa' | 'savings';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  wallet: EduPayWallet | null;
  loanProfile: EduPayLoanProfile | null;
  onSuccess: () => void;
  onOpenLoanProfile?: () => void;
}

const DESTINATION_OPTIONS: { value: Destination; label: string; description: string; apyHint?: string }[] = [
  {
    value: 'student_loan',
    label: 'Student Loan',
    description: 'Pay directly toward your outstanding student loan balance',
  },
  {
    value: 'isa',
    label: 'ISA',
    description: 'Save into a tax-free ISA and earn interest before paying your loan',
    apyHint: 'Up to 5.1% APY',
  },
  {
    value: 'savings',
    label: 'Savings Account',
    description: 'Transfer to a savings account and grow your money first',
    apyHint: 'Up to 4.6% APY',
  },
];

const STEP_LABELS = ['Amount', 'Review', 'Done'];

export default function EduPayConversionModal({ isOpen, onClose, wallet, loanProfile, onSuccess, onOpenLoanProfile }: Props) {
  const searchParams = useSearchParams();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [epAmount, setEpAmount] = useState('');
  const [destination, setDestination] = useState<Destination>('student_loan');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stubMessage, setStubMessage] = useState<string | null>(null);

  // ISA/Savings state
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [linkingProvider, setLinkingProvider] = useState(false);

  // Show step 3 if redirected back from TrueLayer with ?conversion=success
  useEffect(() => {
    if (isOpen && searchParams?.get('conversion') === 'success') {
      setStep(3);
    }
  }, [isOpen, searchParams]);

  // Load linked accounts when modal opens
  const loadLinkedAccounts = useCallback(async () => {
    try {
      const accounts = await getLinkedAccounts();
      setLinkedAccounts(accounts);
      // Auto-select first matching account for destination
      const matchingAccount = accounts.find(a => a.provider_type === destination);
      if (matchingAccount) {
        setSelectedAccountId(matchingAccount.id);
      }
    } catch {
      console.error('Failed to load linked accounts');
    }
  }, [destination]);

  useEffect(() => {
    if (isOpen) {
      void loadLinkedAccounts();
    }
  }, [isOpen, loadLinkedAccounts]);

  // Update selected account when destination changes
  useEffect(() => {
    if (destination === 'isa' || destination === 'savings') {
      const matchingAccount = linkedAccounts.find(a => a.provider_type === destination);
      setSelectedAccountId(matchingAccount?.id ?? null);
    } else {
      setSelectedAccountId(null);
    }
  }, [destination, linkedAccounts]);

  const availableEp = wallet?.available_ep ?? 0;
  const epNum = parseInt(epAmount, 10) || 0;
  const gbpPreview = (epNum / 100).toFixed(2);
  const gbpAmount = epNum / 100;

  const isSavingsDestination = destination === 'isa' || destination === 'savings';
  const selectedAccount = linkedAccounts.find(a => a.id === selectedAccountId);
  const availableProviders = isSavingsDestination
    ? getProvidersByType(destination as ProviderType)
    : [];

  function handleClose() {
    setStep(1);
    setEpAmount('');
    setDestination('student_loan');
    setError(null);
    setStubMessage(null);
    setShowProviderSelector(false);
    setSelectedAccountId(null);
    onClose();
  }

  function handleMaxEp() {
    setEpAmount(String(availableEp));
  }

  async function handleLinkProvider(provider: SavingsProvider) {
    setLinkingProvider(true);
    setError(null);
    try {
      const account = await linkAccount({ provider_id: provider.id });
      setLinkedAccounts(prev => [...prev, account]);
      setSelectedAccountId(account.id);
      setShowProviderSelector(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link account');
    } finally {
      setLinkingProvider(false);
    }
  }

  async function handleAuthorise() {
    setError(null);
    setLoading(true);
    try {
      const payload: { ep_amount: number; destination: Destination; linked_account_id?: string } = {
        ep_amount: epNum,
        destination,
      };

      if (isSavingsDestination && selectedAccountId) {
        payload.linked_account_id = selectedAccountId;
      }

      const result = await requestConversion(payload);

      if (result.stub) {
        setStubMessage(
          result.message ??
            (isSavingsDestination
              ? 'Your allocation has been recorded.'
              : 'TrueLayer credentials are not yet configured. Your conversion has been recorded.')
        );
        if (isSavingsDestination) {
          // For savings, show success after stub message
          setStep(3);
          onSuccess();
        }
      } else if ('auth_url' in result && result.auth_url) {
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

  // Check if can proceed to step 2 (balance validation shown on review step)
  const canProceedToReview = epNum > 0 &&
    (!isSavingsDestination || selectedAccountId);

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
          setError(null);
          setStep(2);
        }}
        disabled={!canProceedToReview}
      >
        Review
      </Button>
    </div>
  );

  // ── Step 2 footer ──────────────────────────────────────────────────────────
  const step2Footer = (
    <div className={styles.footerRow}>
      <Button variant="secondary" size="sm" onClick={() => { setStubMessage(null); setStep(1); }}>
        Back
      </Button>
      {!stubMessage ? (
        <Button
          variant="primary"
          size="sm"
          onClick={() => void handleAuthorise()}
          disabled={loading || epNum <= 0 || epNum > availableEp}
        >
          {loading ? 'Processing...' : isSavingsDestination ? 'Confirm Allocation' : 'Authorise with your bank'}
        </Button>
      ) : (
        <Button variant="primary" size="sm" onClick={handleClose}>
          Done
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

  // Interest projection for review step
  const projections = selectedAccount && gbpAmount > 0
    ? projectSavingsGrowth(gbpAmount, selectedAccount.interest_rate)
    : null;

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
                  {s}
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
      {step === 1 && !showProviderSelector && (
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
                  <div className={styles.destHeader}>
                    <span className={styles.destLabel}>{opt.label}</span>
                    {opt.apyHint && <span className={styles.destApy}>{opt.apyHint}</span>}
                  </div>
                  <span className={styles.destDesc}>{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Provider selector for ISA/Savings */}
          {isSavingsDestination && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                {destination === 'isa' ? 'ISA Provider' : 'Savings Account'}
              </h3>
              {selectedAccount ? (
                <div className={styles.linkedAccountCard}>
                  <div className={styles.linkedAccountTop}>
                    <div className={styles.linkedAccountInfo}>
                      <span className={styles.linkedAccountName}>{selectedAccount.provider_name}</span>
                      <span className={styles.linkedAccountRate}>
                        {selectedAccount.interest_rate}% APY
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.changeBtn}
                      onClick={() => setShowProviderSelector(true)}
                    >
                      Change
                    </button>
                  </div>
                  {gbpAmount > 0 && (
                    <>
                      <div className={styles.linkedAccountDivider} />
                      <div className={styles.linkedAccountInterest}>
                        <span className={styles.interestPreviewLabel}>
                          Projected interest (12 months):
                        </span>
                        <span className={styles.interestPreviewValue}>
                          +{formatGBP(calculateInterest(gbpAmount, selectedAccount.interest_rate, 12))}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.linkProviderBtn}
                  onClick={() => setShowProviderSelector(true)}
                >
                  Link {destination === 'isa' ? 'an ISA' : 'a Savings Account'}
                </button>
              )}
            </div>
          )}

          {error && <p className={styles.errorMsg}>{error}</p>}
        </div>
      )}

      {/* ── Provider selector sub-view ───────────────────────────────────── */}
      {step === 1 && showProviderSelector && (
        <div className={styles.body}>
          <div className={styles.section}>
            <div className={styles.providerHeader}>
              <h3 className={styles.sectionTitle}>
                Choose {destination === 'isa' ? 'ISA' : 'Savings'} Provider
              </h3>
              <button
                type="button"
                className={styles.backLink}
                onClick={() => setShowProviderSelector(false)}
              >
                Back
              </button>
            </div>
            <div className={styles.providerList}>
              {availableProviders.map(provider => (
                <button
                  key={provider.id}
                  type="button"
                  className={styles.providerCard}
                  onClick={() => void handleLinkProvider(provider)}
                  disabled={linkingProvider}
                >
                  <div className={styles.providerInfo}>
                    <span className={styles.providerName}>{provider.name}</span>
                    <span className={styles.providerRate}>{provider.interestRate}% APY</span>
                  </div>
                  <span className={styles.providerDesc}>{provider.description}</span>
                </button>
              ))}
            </div>
            {linkingProvider && (
              <p className={styles.linkingText}>Connecting to provider...</p>
            )}
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
                  {selectedAccount
                    ? selectedAccount.provider_name
                    : DESTINATION_OPTIONS.find(o => o.value === destination)?.label}
                </span>
              </div>
              {!isSavingsDestination && (
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Payment Reference</span>
                  {loanProfile?.slc_reference ? (
                    <span className={styles.fieldValue}>{loanProfile.slc_reference}</span>
                  ) : (
                    <span className={styles.fieldValueMuted}>
                      Not set — click to set up{' '}
                      <a
                        href="#"
                        className={styles.fieldValueLink}
                        onClick={(e) => {
                          e.preventDefault();
                          onClose();
                          onOpenLoanProfile?.();
                        }}
                      >
                        Loan Profile
                      </a>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Interest projection table for ISA/Savings */}
          {isSavingsDestination && projections && selectedAccount && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                Interest Projection at {selectedAccount.interest_rate}% APY
              </h3>
              <div className={styles.projectionTable}>
                {projections.map(p => (
                  <div key={p.months} className={styles.projectionRow}>
                    <span className={styles.projectionPeriod}>{p.label}</span>
                    <span className={styles.projectionInterest}>+{formatGBP(p.interest)}</span>
                    <span className={styles.projectionTotal}>{formatGBP(p.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stubMessage ? (
            <div className={styles.stubCallout}>
              <p className={styles.stubTitle}>
                {isSavingsDestination ? 'Allocation Complete' : 'Integration Pending'}
              </p>
              <p className={styles.stubText}>{stubMessage}</p>
              {!isSavingsDestination && (
                <p className={styles.stubText}>
                  Open Banking via TrueLayer will be enabled once partner onboarding is complete.
                </p>
              )}
            </div>
          ) : (epNum <= 0 || epNum > availableEp) ? (
            <div className={styles.earnCallout}>
              <p className={styles.earnTitle}>No EP to convert</p>
              <p className={styles.earnText}>
                {availableEp === 0
                  ? 'You have no EP yet. Earn EP by completing tutoring sessions on Tutorwise.'
                  : `You have ${availableEp.toLocaleString()} EP available. Go back and enter a valid amount.`}
              </p>
            </div>
          ) : (
            <div className={styles.infoCallout}>
              <p className={styles.infoText}>
                {isSavingsDestination
                  ? `Your ${formatGBP(gbpAmount)} will be allocated to ${selectedAccount?.provider_name}. You can withdraw to pay your loan anytime.`
                  : 'You will be redirected to your bank to authorise this payment securely via Open Banking (TrueLayer).'}
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
            <h3 className={styles.successTitle}>
              {isSavingsDestination ? 'Allocation Complete' : 'Payment Authorised'}
            </h3>
            <p className={styles.successText}>
              {isSavingsDestination
                ? `Your ${formatGBP(gbpAmount)} has been allocated to ${selectedAccount?.provider_name ?? 'your savings account'}. Track your earnings in the EduPay dashboard.`
                : 'Your bank has authorised the payment. The transfer is now being processed and your EP balance will update once it completes (typically 1–3 business days).'}
            </p>
          </div>
        </div>
      )}
    </HubComplexModal>
  );
}
