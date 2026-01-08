/**
 * Filename: /organisation/settings/billing/page.tsx
 * Purpose: Billing & Subscription settings page
 * Created: 2026-01-07
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getOrganisationSubscription,
  getOrganisationStats,
  getOrganisationCards,
  setOrganisationDefaultCard,
  removeOrganisationCard,
  createOrganisationCardCheckoutSession,
  type OrganisationCard,
} from '@/lib/api/organisation';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import Button from '@/app/components/ui/actions/Button';
import { useOrganisationSettings } from '@/app/hooks/useOrganisationSettings';
import OrganisationStatsWidget from '@/app/components/feature/organisation/sidebar/OrganisationStatsWidget';
import OrganisationHelpWidget from '@/app/components/feature/organisation/sidebar/OrganisationHelpWidget';
import OrganisationTipWidget from '@/app/components/feature/organisation/sidebar/OrganisationTipWidget';
import OrganisationVideoWidget from '@/app/components/feature/organisation/sidebar/OrganisationVideoWidget';
import { getTrialStatus } from '@/lib/stripe/organisation-trial-status';
import getStripe from '@/lib/utils/get-stripejs';
import toast from 'react-hot-toast';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import styles from './page.module.css';

export default function BillingSettingsPage() {
  const { organisation, profile, isLoading, tabs, handleTabChange } = useOrganisationSettings({
    currentTab: 'billing',
  });

  // Fetch subscription data with proper loading patterns
  const {
    data: subscription,
    isLoading: subscriptionLoading,
    isFetching: subscriptionFetching,
  } = useQuery({
    queryKey: ['organisation-subscription', organisation?.id],
    queryFn: () => getOrganisationSubscription(organisation!.id),
    enabled: !!organisation?.id,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // Fetch organisation stats for sidebar
  const { data: stats } = useQuery({
    queryKey: ['organisation-stats', organisation?.id],
    queryFn: () => getOrganisationStats(organisation!.id),
    enabled: !!organisation,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isVerifying, setIsVerifying] = useState(false);

  // Fetch payment methods (cards) for organisation subscription
  const {
    data: cardsData,
    isLoading: cardsLoading,
    refetch: refetchCards,
  } = useQuery({
    queryKey: ['organisation-cards', organisation?.id],
    queryFn: () => getOrganisationCards(organisation!.id),
    enabled: !!organisation?.id && !!subscription?.stripe_customer_id,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const savedCards = cardsData?.cards || [];
  const defaultPaymentMethodId = cardsData?.defaultPaymentMethodId || null;

  // Mutation: Set default card
  const setDefaultMutation = useMutation({
    mutationFn: ({ paymentMethodId }: { paymentMethodId: string }) =>
      setOrganisationDefaultCard(organisation!.id, paymentMethodId),
    onSuccess: (_, { paymentMethodId }) => {
      queryClient.setQueryData(
        ['organisation-cards', organisation?.id],
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
      removeOrganisationCard(organisation!.id, paymentMethodId),
    onSuccess: (_, { paymentMethodId }) => {
      queryClient.setQueryData(
        ['organisation-cards', organisation?.id],
        (old: any) => ({
          ...old,
          cards: old.cards.filter((card: OrganisationCard) => card.id !== paymentMethodId),
        })
      );
      toast.success('Card removed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove card');
    },
  });

  const trialStatus = getTrialStatus(subscription || null);

  // Check if Stripe is configured
  const isStripeConfigured = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  // Handle Start Trial - Redirects to Stripe Checkout
  const handleStartTrial = async () => {
    if (!organisation) {
      toast.error('Organisation not found');
      console.error('handleStartTrial: organisation is null or undefined');
      return;
    }

    console.log('handleStartTrial: Starting trial for organisation:', {
      id: organisation.id,
      name: organisation.name,
      profile_id: organisation.profile_id,
    });

    try {
      const response = await fetch('/api/stripe/checkout/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organisationId: organisation.id }),
      });

      const data = await response.json();
      console.log('handleStartTrial: API response:', { status: response.status, data });

      if (!response.ok) {
        toast.error(data.error || 'Failed to create checkout session');
        console.error('handleStartTrial: API error:', data);
        return;
      }

      if (!data.url) {
        toast.error('No checkout URL returned');
        console.error('handleStartTrial: No URL in response');
        return;
      }

      console.log('handleStartTrial: Redirecting to:', data.url);
      window.location.href = data.url;
    } catch (error) {
      console.error('Error starting trial:', error);
      toast.error('Failed to start trial. Please try again.');
    }
  };

  // Handle Manage Subscription - Opens Stripe Customer Portal
  const handleManageSubscription = async () => {
    if (!organisation) {
      console.error('handleManageSubscription: organisation is null/undefined', {
        organisation,
        isLoading,
        profile,
      });
      toast.error('Organisation not found');
      return;
    }

    console.log('handleManageSubscription: organisation exists', {
      id: organisation.id,
      name: organisation.name,
    });

    // If no subscription exists, redirect to trial checkout instead
    if (!subscription || subscription.status === 'none') {
      return handleStartTrial();
    }

    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organisationId: organisation.id,
          returnUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If no Stripe customer exists, start trial instead
        if (data.error?.includes('No Stripe customer')) {
          toast.error('Please start your trial first');
          return handleStartTrial();
        }

        toast.error(data.error || 'Failed to create customer portal session');
        console.error('Customer portal error:', data);
        return;
      }

      if (!data.url) {
        toast.error('No portal URL returned');
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to open subscription management. Please try again.'
      );
    }
  };

  // Card verification polling after checkout
  useEffect(() => {
    const status = searchParams?.get('status');
    const customerId = searchParams?.get('customer_id');
    const orgId = searchParams?.get('organisation_id');

    if (status === 'success' && customerId && orgId === organisation?.id && !isVerifying) {
      setIsVerifying(true);
      const toastId = toast.loading('Verifying your new card...');
      let attempts = 0;
      const maxAttempts = 6;
      const initialCardCount = savedCards.length;

      const pollForNewCard = async () => {
        try {
          const data = await getOrganisationCards(organisation!.id);
          const newCards = data.cards || [];

          if (newCards.length > initialCardCount) {
            queryClient.setQueryData(
              ['organisation-cards', organisation?.id],
              data
            );
            toast.success('Your new card was added successfully!', { id: toastId });
            router.replace('/organisation/settings/billing', { scroll: false });
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
          router.replace('/organisation/settings/billing', { scroll: false });
          setIsVerifying(false);
          setTimeout(() => refetchCards(), 1000);
        }
      }, 2000);

      return () => clearInterval(poll);
    }
  }, [searchParams, isVerifying, router, savedCards.length, refetchCards, queryClient, organisation]);

  // Handle Add New Card
  const handleAddNewCard = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!organisation) return;

    const toastId = toast.loading('Redirecting to Stripe...');
    try {
      const sessionId = await createOrganisationCardCheckoutSession(organisation.id);
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

  if (isLoading || subscriptionLoading) {
    return (
      <div className={styles.loading}>
        <p>Loading billing settings...</p>
      </div>
    );
  }

  // Guard against missing organisation after loading
  if (!organisation) {
    return (
      <div className={styles.loading}>
        <p>Organisation not found. Please create an organisation first.</p>
      </div>
    );
  }

  return (
    <HubPageLayout
      header={
        <HubHeader
          title="Billing & Subscription"
          subtitle="Manage your subscription, payment methods, and billing history"
        />
      }
      tabs={<HubTabs tabs={tabs} onTabChange={handleTabChange} />}
      sidebar={
        <HubSidebar>
          <OrganisationStatsWidget
            teamSize={stats?.team_size || 0}
            totalClients={stats?.total_clients || 0}
            monthlyRevenue={stats?.monthly_revenue || 0}
          />
          <OrganisationHelpWidget
            subscription={subscription || null}
            onManageSubscription={handleManageSubscription}
          />
          <OrganisationTipWidget />
          <OrganisationVideoWidget />
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
                      <li>Create an &quot;Organisation Premium&quot; product in your Stripe Dashboard</li>
                      <li>Set the price to £50/month with a 14-day trial period</li>
                      <li>Copy the Price ID and add it to STRIPE_PREMIUM_PRICE_ID in .env.local</li>
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
              // Active trial
              if (trialStatus && trialStatus.daysRemaining > 0 && trialStatus.daysRemaining <= 14) {
                return (
                  <div
                    className={`${styles.statusBox} ${
                      trialStatus.daysRemaining <= 3
                        ? styles.urgentAlert
                        : trialStatus.daysRemaining <= 7
                        ? styles.warningAlert
                        : styles.infoAlert
                    }`}
                  >
                    <div className={styles.statusContent}>
                      <div>
                        <h4 className={styles.statusTitle}>Trial Active</h4>
                        <p className={styles.statusText}>
                          {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? 'day' : 'days'} remaining
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
              if (trialStatus && trialStatus.isExpired) {
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
                        £50/month after trial period
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

        {/* Billing History Card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Billing History</h3>
          <div className={styles.cardContent}>
            {subscription && subscription.status !== 'none' ? (
              <div className={styles.planDetails}>
                <div className={styles.planItem}>
                  <span className={styles.planLabel}>Subscription Started:</span>
                  <span className={styles.planValue}>{formatDate(subscription.created_at)}</span>
                </div>
                <div className={styles.planItem}>
                  <span className={styles.planLabel}>Current Period:</span>
                  <span className={styles.planValue}>
                    {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                  </span>
                </div>
                <div className={styles.planItem}>
                  <span className={styles.planLabel}>Status:</span>
                  <span className={styles.planValue}>
                    {subscription.status === 'active' ? 'Active' :
                     subscription.status === 'trialing' ? 'Trial' :
                     subscription.status === 'canceled' ? 'Canceled' :
                     subscription.status}
                  </span>
                </div>
                {subscription.trial_start && subscription.trial_end && (
                  <div className={styles.planItem}>
                    <span className={styles.planLabel}>Trial Period:</span>
                    <span className={styles.planValue}>
                      {formatDate(subscription.trial_start)} - {formatDate(subscription.trial_end)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className={styles.infoText}>
                No billing history available. Start your subscription to see billing details.
              </p>
            )}
          </div>
        </div>

        {/* Plan Details Card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Plan Details</h3>
          <div className={styles.cardContent}>
            <div className={styles.planDetails}>
              <div className={styles.planItem}>
                <span className={styles.planLabel}>Plan:</span>
                <span className={styles.planValue}>Organisation Premium</span>
              </div>
              <div className={styles.planItem}>
                <span className={styles.planLabel}>Price:</span>
                <span className={styles.planValue}>£50/month</span>
              </div>
              <div className={styles.planItem}>
                <span className={styles.planLabel}>Features:</span>
                <ul className={styles.featureList}>
                  <li>Unlimited team members</li>
                  <li>Advanced analytics and reporting</li>
                  <li>Referral program management</li>
                  <li>Priority support</li>
                  <li>Custom integrations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HubPageLayout>
  );
}
