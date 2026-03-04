/**
 * Filename: growth/billing/page.tsx
 * Purpose: Growth Pro billing & subscription management page
 * Updated: 2026-03-04 — Organisation 4-card layout + Growth technical foundation
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import Button from '@/app/components/ui/actions/Button';
import { useGrowthBilling } from '@/app/hooks/useGrowthBilling';
import GrowthSubscriptionWidget from '@/components/feature/growth/widgets/GrowthSubscriptionWidget';
import GrowthHelpWidget from '@/components/feature/growth/widgets/GrowthHelpWidget';
import getStripe from '@/lib/utils/get-stripejs';
import toast from 'react-hot-toast';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import HubComplexModal from '@/app/components/hub/modal/HubComplexModal/HubComplexModal';
import styles from './page.module.css';

function CardBrandBadge({ brand }: { brand: string }) {
  const BRANDS: Record<string, { label: string; bg: string; color: string }> = {
    visa:       { label: 'VISA', bg: '#1a1f71', color: '#fff' },
    mastercard: { label: 'MC',   bg: '#eb001b', color: '#fff' },
    amex:       { label: 'AMEX', bg: '#007bc1', color: '#fff' },
    discover:   { label: 'DISC', bg: '#ff6600', color: '#fff' },
    diners:     { label: 'DC',   bg: '#004a97', color: '#fff' },
    jcb:        { label: 'JCB',  bg: '#003087', color: '#fff' },
    unionpay:   { label: 'UP',   bg: '#d40000', color: '#fff' },
  };
  const b = BRANDS[brand.toLowerCase()] ?? { label: brand.toUpperCase().slice(0, 4), bg: '#6b7280', color: '#fff' };
  return (
    <span style={{
      background: b.bg, color: b.color, fontSize: '9px', fontWeight: 700,
      padding: '2px 5px', borderRadius: '3px', letterSpacing: '0.5px',
      flexShrink: 0, display: 'inline-block',
    }}>
      {b.label}
    </span>
  );
}

interface InvoiceItem {
  id: string;
  number: string | null;
  created: string;
  amount_paid: number;
  currency: string;
  status: string;
  hosted_invoice_url: string | null;
}

async function getGrowthInvoices(): Promise<{ invoices: InvoiceItem[] }> {
  const response = await fetch('/api/stripe/growth/invoices');
  if (!response.ok) throw new Error('Failed to fetch invoices');
  return response.json();
}

interface GrowthCard {
  id: string;
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
}

async function getGrowthCards(): Promise<{ cards: GrowthCard[]; defaultPaymentMethodId: string | null }> {
  const response = await fetch('/api/stripe/growth/get-cards');
  if (!response.ok) throw new Error('Failed to fetch cards');
  return response.json();
}

async function createGrowthCardCheckoutSession(): Promise<string> {
  const response = await fetch('/api/stripe/growth/add-card-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create checkout session');
  return data.sessionId;
}

async function setGrowthDefaultCard(paymentMethodId: string): Promise<void> {
  const response = await fetch('/api/stripe/growth/set-default-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethodId }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to set default card');
  }
}

async function removeGrowthCard(paymentMethodId: string): Promise<void> {
  const response = await fetch('/api/stripe/growth/remove-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethodId }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to remove card');
  }
}

export default function GrowthBillingPage() {
  const { subscription, isPro, isLoading } = useGrowthBilling();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const {
    data: cardsData,
    isLoading: cardsLoading,
    refetch: refetchCards,
  } = useQuery({
    queryKey: ['growth-cards'],
    queryFn: getGrowthCards,
    enabled: !!subscription?.stripe_customer_id,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const savedCards = cardsData?.cards || [];
  const defaultPaymentMethodId = cardsData?.defaultPaymentMethodId || null;

  const { data: invoicesData } = useQuery({
    queryKey: ['growth-invoices'],
    queryFn: getGrowthInvoices,
    enabled: !!subscription?.stripe_customer_id,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const invoices = invoicesData?.invoices || [];

  const setDefaultMutation = useMutation({
    mutationFn: ({ paymentMethodId }: { paymentMethodId: string }) => setGrowthDefaultCard(paymentMethodId),
    onSuccess: (_, { paymentMethodId }) => {
      queryClient.setQueryData(['growth-cards'], (old: any) => ({ ...old, defaultPaymentMethodId: paymentMethodId }));
      toast.success('Default payment method updated');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to set default card'),
  });

  const removeCardMutation = useMutation({
    mutationFn: ({ paymentMethodId }: { paymentMethodId: string }) => removeGrowthCard(paymentMethodId),
    onSuccess: (_, { paymentMethodId }) => {
      queryClient.setQueryData(['growth-cards'], (old: any) => ({
        ...old,
        cards: old.cards.filter((card: GrowthCard) => card.id !== paymentMethodId),
      }));
      toast.success('Card removed successfully');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to remove card'),
  });

  const isStripeConfigured = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  const handleSubscribe = async () => {
    try {
      const response = await fetch('/api/stripe/growth/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Failed to create checkout session'); return; }
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error('Failed to start subscription. Please try again.');
    }
  };

  const handleManageSubscription = async () => {
    if (!isPro) return handleSubscribe();
    try {
      const response = await fetch('/api/stripe/growth/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: `${window.location.origin}/growth/billing` }),
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.error || 'Failed to open billing portal'); return; }
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error('Failed to open billing portal. Please try again.');
    }
  };

  // Card verification polling after checkout
  useEffect(() => {
    const status = searchParams?.get('status');
    const customerId = searchParams?.get('customer_id');

    if (status === 'success' && customerId && !isVerifying) {
      setIsVerifying(true);
      const toastId = toast.loading('Verifying your new card...');
      let attempts = 0;
      const initialCardCount = savedCards.length;

      const poll = setInterval(async () => {
        attempts++;
        try {
          const data = await getGrowthCards();
          if ((data.cards || []).length > initialCardCount) {
            queryClient.setQueryData(['growth-cards'], data);
            toast.success('Your new card was added successfully!', { id: toastId });
            router.replace('/growth/billing', { scroll: false });
            setIsVerifying(false);
            clearInterval(poll);
            return;
          }
        } catch { /* ignore */ }

        if (attempts >= 6) {
          clearInterval(poll);
          toast.error('Card verification timed out. Please refresh to see your new card.', { id: toastId });
          router.replace('/growth/billing', { scroll: false });
          setIsVerifying(false);
          setTimeout(() => refetchCards(), 1000);
        }
      }, 2000);

      return () => clearInterval(poll);
    }
  }, [searchParams, isVerifying, router, savedCards.length, refetchCards, queryClient]);

  const handleAddNewCard = async (e: React.MouseEvent) => {
    e.preventDefault();
    const toastId = toast.loading('Redirecting to Stripe...');
    try {
      const sessionId = await createGrowthCardCheckoutSession();
      const stripe = await getStripe();
      if (!stripe) throw new Error('Stripe.js failed to load');
      await stripe.redirectToCheckout({ sessionId });
      toast.dismiss(toastId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add card', { id: toastId });
    }
  };

  const handleCancelConfirm = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch('/api/stripe/growth/cancel', { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('Subscription cancelled. Access continues until the billing period ends.');
      queryClient.invalidateQueries({ queryKey: ['growth-subscription'] });
      setIsCancelOpen(false);
    } catch {
      toast.error('Failed to cancel subscription. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return <div className={styles.loading}><p>Loading billing settings...</p></div>;
  }

  // ── Subscription state ──────────────────────────────────────────────────────
  const isPastDue = subscription?.status === 'past_due';

  const alertClass = isPro && !isPastDue ? styles.activeAlert
    : isPastDue ? styles.urgentAlert
    : styles.neutralAlert;

  const statusTitle = isPro && !isPastDue ? 'Subscription Active'
    : isPastDue ? 'Payment Past Due'
    : 'Free Tier';

  const ctaLabel = isPro ? 'Manage Subscription' : 'Upgrade to Growth Pro · £10/month';

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Growth Pro Billing"
          subtitle="Manage your Growth AI Advisor subscription and payment methods"
        />
      }
      tabs={
        <HubTabs
          tabs={[
            { id: 'chat', label: 'Chat', href: '/growth' },
            { id: 'history', label: 'History', href: '/growth/history' },
            { id: 'billing', label: 'Billing', active: true },
          ]}
          onTabChange={(tabId) => {
            if (tabId !== 'billing') router.push(tabId === 'chat' ? '/growth' : `/growth/${tabId}`);
          }}
        />
      }
      sidebar={
        <HubSidebar>
          <GrowthSubscriptionWidget subscription={subscription} />
          <GrowthHelpWidget />
        </HubSidebar>
      }
    >
      <div className={styles.content}>

        {/* ── Current Subscription ─────────────────────────────── */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Current Subscription</h3>
          <div className={styles.cardContent}>
            <div className={`${styles.statusBox} ${alertClass}`}>
              <div className={styles.statusContent}>
                <div>
                  <h4 className={styles.statusTitle}>{statusTitle}</h4>
                  {isPro && !isPastDue && (
                    <>
                      <p className={styles.statusText}>
                        £10/month · Next billing: {formatDate(subscription?.current_period_end || null)}
                      </p>
                      <p className={styles.statusText}>
                        {subscription?.cancel_at_period_end ? 'Cancels at end of period' : 'Renews automatically'}
                      </p>
                      {subscription && (
                        <div>
                          <div className={styles.usageRow}>
                            <span>Questions used this period</span>
                            <strong>
                              {(subscription.questions_used_this_period ?? 0).toLocaleString()} / {(subscription.questions_limit ?? 5000).toLocaleString()}
                            </strong>
                          </div>
                          <div className={styles.usageBar}>
                            <div
                              className={styles.usageFill}
                              style={{
                                width: `${Math.min(((subscription.questions_used_this_period ?? 0) / (subscription.questions_limit ?? 5000)) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {isPastDue && (
                    <p className={styles.statusText}>
                      Update your payment method to continue access
                    </p>
                  )}
                  {!isPro && !isPastDue && (
                    <>
                      <p className={styles.statusText}>10 free questions per day included</p>
                      <p className={styles.statusText}>£10/month for 5,000 questions and full access</p>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <Button
                    onClick={handleManageSubscription}
                    variant="primary"
                    size="md"
                    disabled={!isStripeConfigured}
                  >
                    {ctaLabel}
                  </Button>
                  {isPro && !subscription?.cancel_at_period_end && (
                    <button className={styles.cancelLink} onClick={() => setIsCancelOpen(true)}>
                      Cancel subscription
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Payment Methods ──────────────────────────────────── */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Payment Methods</h3>
          <div className={styles.cardContent}>
            <div className={styles.paymentMethodsGrid}>

              <div className={styles.leftColumn}>
                <div className={styles.savedCardsHeader}>
                  <h4 className={styles.savedCardsTitle}>Saved Cards</h4>
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); refetchCards(); toast.success('Card data refreshed'); }}
                    className={styles.cardLink}
                  >
                    Refresh
                  </a>
                </div>
                <div className={styles.savedCardsList}>
                  {!subscription?.stripe_customer_id ? (
                    <div className={styles.noCardsMessage}>Add your first card to start managing subscription payments.</div>
                  ) : cardsLoading ? (
                    <div className={styles.noCardsMessage}>Loading cards...</div>
                  ) : savedCards.length === 0 ? (
                    <div className={styles.noCardsMessage}>No saved cards. Add a card to manage your subscription.</div>
                  ) : (
                    savedCards.map((card) => (
                      <div key={card.id} className={styles.savedCard}>
                        <CardBrandBadge brand={card.brand || 'unknown'} />
                        <div className={styles.savedCardDetails}>
                          <span>
                            **** {card.last4}
                            {card.id === defaultPaymentMethodId && (
                              <span className={styles.defaultBadge}>DEFAULT</span>
                            )}
                          </span>
                          <span className={styles.cardExpiry}>
                            Expires: {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
                          </span>
                        </div>
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button className={styles.manageButton}>Manage</button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content className={styles.dropdownContent} sideOffset={5} align="end">
                              {card.id !== defaultPaymentMethodId && (
                                <DropdownMenu.Item
                                  className={styles.dropdownItem}
                                  onSelect={() => setDefaultMutation.mutate({ paymentMethodId: card.id })}
                                >
                                  Set as default
                                </DropdownMenu.Item>
                              )}
                              <DropdownMenu.Item
                                className={`${styles.dropdownItem} ${styles.destructive}`}
                                onSelect={() => removeCardMutation.mutate({ paymentMethodId: card.id })}
                              >
                                Remove
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={styles.rightColumn}>
                <p className={styles.infoText}>
                  Add or manage credit and debit cards for your subscription payments.
                </p>
                <Button onClick={handleAddNewCard} variant="primary" size="md" disabled={!isStripeConfigured}>
                  Add New Card
                </Button>
              </div>

            </div>
          </div>
        </div>

        {/* ── Billing History ──────────────────────────────────── */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Billing History</h3>
          <div className={styles.cardContent}>
            {invoices.length === 0 ? (
              <p className={styles.infoText}>No payment history yet.</p>
            ) : (
              <div className={styles.invoiceList}>
                {invoices.map((inv) => (
                  <div key={inv.id} className={styles.invoiceRow}>
                    <span className={styles.invoiceDate}>{formatDate(inv.created)}</span>
                    <span className={styles.invoiceAmount}>
                      £{(inv.amount_paid / 100).toFixed(2)}
                    </span>
                    <span className={`${styles.invoiceStatus} ${styles[`status_${inv.status}` as keyof typeof styles]}`}>
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                    {inv.hosted_invoice_url && (
                      <a
                        href={inv.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.invoiceLink}
                      >
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Plan Details ─────────────────────────────────────── */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Plan Details</h3>
          <div className={styles.cardContent}>
            <div className={styles.planDetails}>
              <div className={styles.planItem}>
                <span className={styles.planLabel}>Plan</span>
                <span className={styles.planValue}>Growth Pro</span>
              </div>
              <div className={styles.planItem}>
                <span className={styles.planLabel}>Price</span>
                <span className={styles.planValue}>£10/month</span>
              </div>
              <div className={styles.planItem}>
                <span className={styles.planLabel}>Features</span>
                <ul className={styles.featureList}>
                  <li>5,000 questions/month</li>
                  <li>Role-adaptive AI advisor (tutors, agents, clients, organisations)</li>
                  <li>Live metrics context (income, students, referrals)</li>
                  <li>Revenue Audit</li>
                  <li>Session history</li>
                  <li>Priority responses</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </div>

      <HubComplexModal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        title="Cancel Subscription"
        size="sm"
      >
        <div className={styles.cancelModalContent}>
          <p className={styles.cancelModalText}>
            Your subscription will remain active until{' '}
            <strong>{formatDate(subscription?.current_period_end || null)}</strong>.
            After that, you will lose access to Growth Pro features.
          </p>
          <div className={styles.cancelModalActions}>
            <button
              className={styles.cancelModalKeep}
              onClick={() => setIsCancelOpen(false)}
              disabled={isCancelling}
            >
              Keep Subscription
            </button>
            <button
              className={styles.cancelModalConfirm}
              onClick={handleCancelConfirm}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling…' : 'Cancel Subscription'}
            </button>
          </div>
        </div>
      </HubComplexModal>

    </HubPageLayout>
  );
}
