/**
 * Filename: /sage/billing/page.tsx
 * Purpose: Sage Pro billing & subscription management page
 * Created: 2026-02-22
 * Pattern: Follows Organisation Billing pattern with HubPageLayout + 4-card sidebar
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { HubPageLayout, HubHeader } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import Button from '@/app/components/ui/actions/Button';
import { useSageBilling } from '@/app/hooks/useSageBilling';
import SageStatsWidget from '@/app/components/feature/sage/sidebar/SageStatsWidget';
import SageHelpWidget from '@/app/components/feature/sage/sidebar/SageHelpWidget';
import SageTipWidget from '@/app/components/feature/sage/sidebar/SageTipWidget';
import SageVideoWidget from '@/app/components/feature/sage/sidebar/SageVideoWidget';
import getStripe from '@/lib/utils/get-stripejs';
import toast from 'react-hot-toast';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import styles from './page.module.css';

interface SageCard {
  id: string;
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
}

async function getSageCards(): Promise<{ cards: SageCard[]; defaultPaymentMethodId: string | null }> {
  const response = await fetch('/api/stripe/sage/get-cards');
  if (!response.ok) throw new Error('Failed to fetch cards');
  return response.json();
}

async function createSageCardCheckoutSession(): Promise<string> {
  const response = await fetch('/api/stripe/sage/add-card-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create checkout session');
  return data.sessionId;
}

async function setSageDefaultCard(paymentMethodId: string): Promise<void> {
  const response = await fetch('/api/stripe/sage/set-default-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethodId }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to set default card');
  }
}

async function removeSageCard(paymentMethodId: string): Promise<void> {
  const response = await fetch('/api/stripe/sage/remove-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethodId }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to remove card');
  }
}

export default function SageBillingPage() {
  const { subscription, usageStats, isLoading, isPro } = useSageBilling();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isVerifying, setIsVerifying] = useState(false);

  // Fetch payment methods (cards)
  const {
    data: cardsData,
    isLoading: cardsLoading,
    refetch: refetchCards,
  } = useQuery({
    queryKey: ['sage-cards'],
    queryFn: getSageCards,
    enabled: !!subscription?.stripe_customer_id,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const savedCards = cardsData?.cards || [];
  const defaultPaymentMethodId = cardsData?.defaultPaymentMethodId || null;

  // Mutation: Set default card
  const setDefaultMutation = useMutation({
    mutationFn: ({ paymentMethodId }: { paymentMethodId: string }) =>
      setSageDefaultCard(paymentMethodId),
    onSuccess: (_, { paymentMethodId }) => {
      queryClient.setQueryData(
        ['sage-cards'],
        (old: any) => ({
          ...old,
          defaultPaymentMethodId: paymentMethodId,
        })
      );
      toast.success('Default payment method updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to set default card');
    },
  });

  // Mutation: Remove card
  const removeCardMutation = useMutation({
    mutationFn: ({ paymentMethodId }: { paymentMethodId: string }) =>
      removeSageCard(paymentMethodId),
    onSuccess: (_, { paymentMethodId }) => {
      queryClient.setQueryData(
        ['sage-cards'],
        (old: any) => ({
          ...old,
          cards: old.cards.filter((card: SageCard) => card.id !== paymentMethodId),
        })
      );
      toast.success('Card removed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove card');
    },
  });

  // Check if Stripe is configured
  const isStripeConfigured = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  // Handle Start Trial
  const handleStartTrial = async () => {
    try {
      const response = await fetch('/api/stripe/sage/checkout/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to create checkout session');
        return;
      }

      if (!data.url) {
        toast.error('No checkout URL returned');
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Error starting trial:', error);
      toast.error('Failed to start trial. Please try again.');
    }
  };

  // Handle Manage Subscription
  const handleManageSubscription = async () => {
    if (!subscription || subscription.status === 'canceled') {
      return handleStartTrial();
    }

    try {
      const response = await fetch('/api/stripe/sage/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/sage/billing`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to open billing portal');
        return;
      }

      if (!data.url) {
        toast.error('No billing portal URL returned');
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Error opening billing portal:', error);
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
      const maxAttempts = 6;
      const initialCardCount = savedCards.length;

      const pollForNewCard = async () => {
        try {
          const data = await getSageCards();
          const newCards = data.cards || [];

          if (newCards.length > initialCardCount) {
            queryClient.setQueryData(['sage-cards'], data);
            toast.success('Your new card was added successfully!', { id: toastId });
            router.replace('/sage/billing', { scroll: false });
            setIsVerifying(false);
            return true;
          }

          return false;
        } catch (error) {
          console.error('Polling error:', error);
          return false;
        }
      };

      const poll = setInterval(async () => {
        attempts++;

        const success = await pollForNewCard();
        if (success) {
          clearInterval(poll);
          return;
        }

        if (attempts >= maxAttempts) {
          clearInterval(poll);
          toast.error('Card verification timed out. Please refresh to see your new card.', { id: toastId });
          router.replace('/sage/billing', { scroll: false });
          setIsVerifying(false);
          setTimeout(() => refetchCards(), 1000);
        }
      }, 2000);

      return () => clearInterval(poll);
    }
  }, [searchParams, isVerifying, router, savedCards.length, refetchCards, queryClient]);

  // Handle Add New Card
  const handleAddNewCard = async (e: React.MouseEvent) => {
    e.preventDefault();

    const toastId = toast.loading('Redirecting to Stripe...');
    try {
      const sessionId = await createSageCardCheckoutSession();
      const stripe = await getStripe();

      if (!stripe) {
        throw new Error('Stripe.js failed to load');
      }

      await stripe.redirectToCheckout({ sessionId });
      toast.dismiss(toastId);
    } catch (error) {
      console.error('Add card error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add card', { id: toastId });
    }
  };

  // Handle Set Default Card
  const handleSetDefault = async (paymentMethodId: string) => {
    setDefaultMutation.mutate({ paymentMethodId });
  };

  // Handle Remove Card
  const handleRemove = async (paymentMethodId: string) => {
    removeCardMutation.mutate({ paymentMethodId });
  };

  // Handle Refresh Cards
  const handleRefreshCards = async () => {
    await refetchCards();
    toast.success('Card data refreshed');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <p>Loading billing settings...</p>
      </div>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Sage Pro Billing"
          subtitle="Manage your Sage AI Tutor subscription, usage, and payment methods"
        />
      }
      sidebar={
        <HubSidebar>
          <SageStatsWidget
            questionsUsed={usageStats?.questions.used || 0}
            questionsQuota={usageStats?.questions.quota || 10}
            storageUsedBytes={usageStats?.storage.usedBytes || 0}
            storageQuotaBytes={usageStats?.storage.quotaBytes || 0}
          />
          <SageHelpWidget
            subscription={subscription}
            onManageSubscription={handleManageSubscription}
          />
          <SageTipWidget />
          <SageVideoWidget />
        </HubSidebar>
      }
    >
      <div className={styles.content}>
        {/* Stripe Configuration Notice */}
        {!isStripeConfigured && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Configuration Required</h3>
            <div className={styles.cardContent}>
              <div className={`${styles.statusBox} ${styles.infoAlert}`}>
                <div className={styles.statusContent}>
                  <div>
                    <h4 className={styles.statusTitle}>Stripe Not Configured</h4>
                    <p className={styles.statusText}>
                      The subscription service is not yet configured in the Stripe Dashboard.
                    </p>
                    <p className={styles.statusText}>
                      To enable subscriptions, please:
                    </p>
                    <ul className={styles.featureList}>
                      <li>Create a &quot;Sage Pro&quot; product in your Stripe Dashboard</li>
                      <li>Set the price to £10/month with a 14-day trial period</li>
                      <li>Copy the Price ID and add it to STRIPE_SAGE_PRO_PRICE_ID in .env.local</li>
                      <li>Restart the development server</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Status Card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Current Subscription</h3>
          <div className={styles.cardContent}>
            {(() => {
              const getTrialDaysRemaining = () => {
                if (!subscription?.trial_end) return 0;
                const trialEnd = new Date(subscription.trial_end);
                const now = new Date();
                const diffTime = trialEnd.getTime() - now.getTime();
                return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              };

              const daysRemaining = getTrialDaysRemaining();
              const isTrialing = subscription?.status === 'trialing' && daysRemaining > 0;
              const isTrialExpired = subscription?.trial_end && daysRemaining <= 0;

              // Active trial
              if (isTrialing) {
                return (
                  <div
                    className={`${styles.statusBox} ${
                      daysRemaining <= 3
                        ? styles.urgentAlert
                        : daysRemaining <= 7
                        ? styles.warningAlert
                        : styles.infoAlert
                    }`}
                  >
                    <div className={styles.statusContent}>
                      <div>
                        <h4 className={styles.statusTitle}>Trial Active</h4>
                        <p className={styles.statusText}>
                          {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                        </p>
                        <p className={styles.statusText}>
                          Trial ends {formatDate(subscription?.trial_end || null)}
                        </p>
                      </div>
                      <Button
                        onClick={handleManageSubscription}
                        variant="primary" size="md"
                        disabled={!isStripeConfigured}
                      >
                        Subscribe Now
                      </Button>
                    </div>
                  </div>
                );
              }

              // Expired trial
              if (isTrialExpired) {
                return (
                  <div className={`${styles.statusBox} ${styles.expiredAlert}`}>
                    <div className={styles.statusContent}>
                      <div>
                        <h4 className={styles.statusTitle}>Trial Expired</h4>
                        <p className={styles.statusText}>
                          Your trial ended on {formatDate(subscription?.trial_end || null)}
                        </p>
                      </div>
                      <Button
                        onClick={handleManageSubscription}
                        variant="primary" size="md"
                        disabled={!isStripeConfigured}
                      >
                        Subscribe to Restore Access
                      </Button>
                    </div>
                  </div>
                );
              }

              // Active subscription
              if (subscription && subscription.status === 'active') {
                return (
                  <div className={`${styles.statusBox} ${styles.activeAlert}`}>
                    <div className={styles.statusContent}>
                      <div>
                        <h4 className={styles.statusTitle}>Subscription Active</h4>
                        <p className={styles.statusText}>
                          Next billing: {formatDate(subscription.current_period_end)}
                        </p>
                        <p className={styles.statusText}>
                          {subscription.cancel_at_period_end ? 'Cancels automatically at end of period' : 'Renews automatically'}
                        </p>
                      </div>
                      <Button
                        onClick={handleManageSubscription}
                        variant="primary" size="md"
                        disabled={!isStripeConfigured}
                      >
                        Manage Subscription
                      </Button>
                    </div>
                  </div>
                );
              }

              // No subscription (default state)
              return (
                <div className={`${styles.statusBox} ${styles.neutralAlert}`}>
                  <div className={styles.statusContent}>
                    <div>
                      <h4 className={styles.statusTitle}>No Active Subscription</h4>
                      <p className={styles.statusText}>
                        Start your 14-day free trial today
                      </p>
                      <p className={styles.statusText}>
                        £10/month after trial period
                      </p>
                    </div>
                    <Button
                      onClick={handleManageSubscription}
                      variant="primary" size="md"
                      disabled={!isStripeConfigured}
                    >
                      Start Free Trial
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Payment Methods */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Payment Methods</h3>
          <div className={styles.cardContent}>
            {/* 2-Column Grid */}
            <div className={styles.paymentMethodsGrid}>
              {/* Left Column: Saved Cards List */}
              <div className={styles.leftColumn}>
                <div className={styles.savedCardsHeader}>
                  <h4 className={styles.savedCardsTitle}>Saved Cards</h4>
                  <a href="#" onClick={(e) => { e.preventDefault(); handleRefreshCards(); }} className={styles.cardLink}>
                    Refresh
                  </a>
                </div>

                <div className={styles.savedCardsList}>
                  {!subscription?.stripe_customer_id ? (
                    <div className={styles.noCardsMessage}>
                      Add your first card to start managing subscription payments.
                    </div>
                  ) : cardsLoading ? (
                    <div className={styles.noCardsMessage}>
                      Loading cards...
                    </div>
                  ) : savedCards.length === 0 ? (
                    <div className={styles.noCardsMessage}>
                      You have no saved cards. Add a card to manage your subscription.
                    </div>
                  ) : (
                    savedCards.map((card) => (
                      <div key={card.id} className={styles.savedCard}>
                        <span className={styles.cardIcon}></span>
                        <div className={styles.savedCardDetails}>
                          <span>
                            {card.brand?.toUpperCase()} **** {card.last4}
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
                                  onSelect={() => handleSetDefault(card.id)}
                                >
                                  Set as default
                                </DropdownMenu.Item>
                              )}
                              <DropdownMenu.Item
                                className={`${styles.dropdownItem} ${styles.destructive}`}
                                onSelect={() => handleRemove(card.id)}
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

              {/* Right Column: Add Card Action */}
              <div className={styles.rightColumn}>
                <p className={styles.infoText}>
                  Add or manage credit and debit cards for your subscription payments.
                </p>
                <Button
                  onClick={handleAddNewCard}
                  variant="primary"
                  size="md"
                  disabled={!isStripeConfigured}
                >
                  Add New Card
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Statistics Card */}
        {usageStats && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Usage This Month</h3>
            <div className={styles.cardContent}>
              <div className={styles.planDetails}>
                <div className={styles.planItem}>
                  <span className={styles.planLabel}>Questions Used:</span>
                  <span className={styles.planValue}>
                    {usageStats.questions.used.toLocaleString()} / {usageStats.questions.quota.toLocaleString()}
                  </span>
                </div>
                <div className={styles.planItem}>
                  <span className={styles.planLabel}>Questions Remaining:</span>
                  <span className={styles.planValue} style={{ color: usageStats.questions.remaining === 0 ? '#ef4444' : '#10b981' }}>
                    {usageStats.questions.remaining.toLocaleString()}
                  </span>
                </div>
                {isPro && (
                  <>
                    <div className={styles.planItem}>
                      <span className={styles.planLabel}>Storage Used:</span>
                      <span className={styles.planValue}>
                        {formatBytes(usageStats.storage.usedBytes)} / {formatBytes(usageStats.storage.quotaBytes)}
                      </span>
                    </div>
                    <div className={styles.planItem}>
                      <span className={styles.planLabel}>Storage Remaining:</span>
                      <span className={styles.planValue} style={{ color: usageStats.storage.remainingBytes === 0 ? '#ef4444' : '#10b981' }}>
                        {formatBytes(usageStats.storage.remainingBytes)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Billing History Card */}
        {subscription && subscription.stripe_customer_id && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Billing Information</h3>
            <div className={styles.cardContent}>
              <div className={styles.planDetails}>
                <div className={styles.planItem}>
                  <span className={styles.planLabel}>Next billing date:</span>
                  <span className={styles.planValue}>{formatDate(subscription.current_period_end)}</span>
                </div>
                {subscription.trial_end && subscription.status === 'trialing' && (
                  <div className={styles.planItem}>
                    <span className={styles.planLabel}>Trial ends:</span>
                    <span className={styles.planValue}>{formatDate(subscription.trial_end)}</span>
                  </div>
                )}
                <div className={styles.planItem}>
                  <span className={styles.planLabel}>Subscription started:</span>
                  <span className={styles.planValue}>{formatDate(subscription.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plan Details Card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Plan Details</h3>
          <div className={styles.cardContent}>
            <div className={styles.planDetails}>
              <div className={styles.planItem}>
                <span className={styles.planLabel}>Plan:</span>
                <span className={styles.planValue}>{isPro ? 'Sage Pro' : 'Free Tier'}</span>
              </div>
              <div className={styles.planItem}>
                <span className={styles.planLabel}>Price:</span>
                <span className={styles.planValue}>{isPro ? '£10/month' : 'Free'}</span>
              </div>
              <div className={styles.planItem}>
                <span className={styles.planLabel}>Features:</span>
                <ul className={styles.featureList}>
                  <li>{isPro ? '5,000' : '10'} questions per month</li>
                  <li>{isPro ? '1 GB' : 'No'} storage for uploads</li>
                  <li>{isPro ? 'All subjects' : 'Maths only'}</li>
                  <li>{isPro ? 'Extended' : 'Basic'} conversation history</li>
                  <li>Priority responses{!isPro && ' (Pro only)'}</li>
                  <li>Progress tracking & analytics{!isPro && ' (Pro only)'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HubPageLayout>
  );
}
