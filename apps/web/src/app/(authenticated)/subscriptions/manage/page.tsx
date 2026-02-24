/**
 * Filename: subscriptions/manage/page.tsx
 * Purpose: Subscription management page for users to view and manage their subscriptions
 * Created: 2026-02-24
 *
 * Shows different views based on active role:
 * - Client: Subscriptions they've purchased
 * - Tutor/Agent: Subscriptions to their listings (their subscribers)
 */

'use client';

import { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRoleGuard } from '@/app/hooks/useRoleGuard';
import toast from 'react-hot-toast';
import styles from './page.module.css';

interface Subscription {
  id: string;
  listing_id: string;
  client_id: string;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  sessions_booked_this_period: number;
  sessions_remaining_this_period: number | null;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  listing: {
    id: string;
    title: string;
    slug: string;
    subscription_config: any;
  };
  client: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email: string;
  };
  details: {
    frequency: string;
    session_duration_minutes: number;
    price_per_month_pence: number;
    term_time_only: boolean;
    session_limit_per_period: number | null;
  };
}

export default function SubscriptionManagePage() {
  const { user, activeRole, isLoading: userLoading } = useUserProfile();
  const { isAllowed, isLoading: roleLoading } = useRoleGuard(['client', 'tutor', 'agent']);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  // Fetch subscriptions
  useEffect(() => {
    async function fetchSubscriptions() {
      try {
        const params = filter !== 'all' ? `?status=${filter}` : '';
        const response = await fetch(`/api/listings/subscriptions/my-subscriptions${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch subscriptions');
        }

        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        toast.error('Failed to load subscriptions');
      } finally {
        setIsLoading(false);
      }
    }

    if (user && !userLoading) {
      fetchSubscriptions();
    }
  }, [user, userLoading, filter]);

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) {
      return;
    }

    try {
      const response = await fetch(`/api/listings/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'User requested cancellation' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel subscription');
      }

      toast.success('Subscription cancelled successfully');

      // Refresh subscriptions
      setSubscriptions(prev =>
        prev.map(sub =>
          sub.id === subscriptionId ? { ...sub, status: 'cancelled' as const } : sub
        )
      );
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel subscription');
    }
  };

  const handlePauseSubscription = async (subscriptionId: string, pause: boolean) => {
    try {
      const response = await fetch(`/api/listings/subscriptions/${subscriptionId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pause }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${pause ? 'pause' : 'resume'} subscription`);
      }

      toast.success(`Subscription ${pause ? 'paused' : 'resumed'} successfully`);

      // Refresh subscriptions
      setSubscriptions(prev =>
        prev.map(sub =>
          sub.id === subscriptionId
            ? { ...sub, status: pause ? ('paused' as const) : ('active' as const) }
            : sub
        )
      );
    } catch (error) {
      console.error(`Error ${pause ? 'pausing' : 'resuming'} subscription:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${pause ? 'pause' : 'resume'} subscription`);
    }
  };

  if (userLoading || roleLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAllowed) {
    return null;
  }

  const filteredSubscriptions = subscriptions;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {activeRole === 'client' ? 'My Subscriptions' : 'My Subscribers'}
        </h1>
        <p className={styles.subtitle}>
          {activeRole === 'client'
            ? 'Manage your active tutoring subscriptions'
            : 'View and manage subscribers to your subscription services'}
        </p>
      </div>

      {/* Filter Tabs */}
      <div className={styles.filters}>
        <button
          className={filter === 'all' ? styles.filterActive : styles.filter}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={filter === 'active' ? styles.filterActive : styles.filter}
          onClick={() => setFilter('active')}
        >
          Active
        </button>
        <button
          className={filter === 'paused' ? styles.filterActive : styles.filter}
          onClick={() => setFilter('paused')}
        >
          Paused
        </button>
        <button
          className={filter === 'cancelled' ? styles.filterActive : styles.filter}
          onClick={() => setFilter('cancelled')}
        >
          Cancelled
        </button>
      </div>

      {/* Subscriptions List */}
      {isLoading ? (
        <div className={styles.loading}>Loading subscriptions...</div>
      ) : filteredSubscriptions.length === 0 ? (
        <div className={styles.empty}>
          <p>No subscriptions found</p>
          {activeRole === 'client' && (
            <a href="/marketplace" className={styles.emptyLink}>Browse subscription services</a>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredSubscriptions.map(subscription => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              activeRole={activeRole}
              onCancel={handleCancelSubscription}
              onPause={handlePauseSubscription}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SubscriptionCardProps {
  subscription: Subscription;
  activeRole: string | null;
  onCancel: (id: string) => void;
  onPause: (id: string, pause: boolean) => void;
}

function SubscriptionCard({ subscription, activeRole, onCancel, onPause }: SubscriptionCardProps) {
  const price = (subscription.details.price_per_month_pence / 100).toFixed(2);
  const frequencyDisplay = subscription.details.frequency === 'daily' ? 'Daily'
    : subscription.details.frequency === 'weekly' ? 'Weekly'
    : 'Fortnightly';

  const periodEnd = new Date(subscription.current_period_end);
  const sessionsRemaining = subscription.sessions_remaining_this_period;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{subscription.listing.title}</h3>
        <span className={`${styles.status} ${styles[`status${subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}`]}`}>
          {subscription.status}
        </span>
      </div>

      {activeRole !== 'client' && (
        <div className={styles.subscriber}>
          <span className={styles.subscriberLabel}>Subscriber:</span>
          <span className={styles.subscriberName}>{subscription.client.full_name}</span>
        </div>
      )}

      <div className={styles.details}>
        <div className={styles.detailRow}>
          <span>Frequency:</span>
          <span>{frequencyDisplay}</span>
        </div>
        <div className={styles.detailRow}>
          <span>Duration:</span>
          <span>{subscription.details.session_duration_minutes} min</span>
        </div>
        <div className={styles.detailRow}>
          <span>Sessions this period:</span>
          <span>
            {subscription.sessions_booked_this_period}
            {sessionsRemaining !== null && ` / ${sessionsRemaining + subscription.sessions_booked_this_period}`}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span>Period ends:</span>
          <span>{periodEnd.toLocaleDateString()}</span>
        </div>
        <div className={styles.detailRow}>
          <span>Monthly price:</span>
          <span className={styles.price}>£{price}</span>
        </div>
      </div>

      {activeRole === 'client' && subscription.status === 'active' && (
        <div className={styles.actions}>
          <button
            className={styles.actionButton}
            onClick={() => onPause(subscription.id, true)}
          >
            Pause
          </button>
          <button
            className={styles.actionButtonDanger}
            onClick={() => onCancel(subscription.id)}
          >
            Cancel
          </button>
        </div>
      )}

      {activeRole === 'client' && subscription.status === 'paused' && (
        <div className={styles.actions}>
          <button
            className={styles.actionButtonPrimary}
            onClick={() => onPause(subscription.id, false)}
          >
            Resume
          </button>
        </div>
      )}
    </div>
  );
}
