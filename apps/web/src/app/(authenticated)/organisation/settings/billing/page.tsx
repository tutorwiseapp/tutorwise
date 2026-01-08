/**
 * Filename: /organisation/settings/billing/page.tsx
 * Purpose: Billing & Subscription settings page
 * Created: 2026-01-07
 */

'use client';

import React from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getOrganisationSubscription, getOrganisationStats } from '@/lib/api/organisation';
import { HubPageLayout, HubHeader, HubTabs } from '@/app/components/hub/layout';
import HubSidebar from '@/app/components/hub/sidebar/HubSidebar';
import Button from '@/app/components/ui/actions/Button';
import { useOrganisationSettings } from '@/app/hooks/useOrganisationSettings';
import OrganisationStatsWidget from '@/app/components/feature/organisation/sidebar/OrganisationStatsWidget';
import OrganisationHelpWidget from '@/app/components/feature/organisation/sidebar/OrganisationHelpWidget';
import OrganisationTipWidget from '@/app/components/feature/organisation/sidebar/OrganisationTipWidget';
import OrganisationVideoWidget from '@/app/components/feature/organisation/sidebar/OrganisationVideoWidget';
import { getTrialStatus } from '@/lib/stripe/organisation-trial-status';
import toast from 'react-hot-toast';
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
          <OrganisationHelpWidget subscription={subscription || null} />
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
                        variant="secondary" size="md"
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

        {/* Payment Method Card */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Payment Method</h3>
          <div className={styles.cardContent}>
            {subscription?.stripe_customer_id ? (
              <>
                <p className={styles.infoText}>
                  Manage your payment methods through the Stripe Customer Portal.
                </p>
                <Button
                  onClick={handleManageSubscription}
                  variant="secondary" size="md"
                  disabled={!isStripeConfigured}
                >
                  Update Payment Method
                </Button>
              </>
            ) : (
              <p className={styles.infoText}>
                Payment method management is available when you set up Stripe billing.
                Your subscription is currently managed internally.
              </p>
            )}
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
