/**
 * Filename: ai-tutors/my-bundles/page.tsx
 * Purpose: Client's active bundle purchases page
 * Created: 2026-02-24
 * Phase: 3C - Bundle Pricing
 *
 * Displays all active bundles owned by the client with session counts.
 */

'use client';

import { useState, useEffect } from 'react';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import styles from './page.module.css';

interface BundlePurchase {
  id: string;
  ai_sessions_remaining: number;
  human_sessions_remaining: number;
  total_paid_pence: number;
  purchased_at: string;
  expires_at: string | null;
  bundle: {
    id: string;
    bundle_name: string;
    description?: string;
    ai_sessions_count: number;
    human_sessions_count: number;
    badge_text?: string;
  };
  ai_tutor: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export default function MyBundlesPage() {
  const { user, isLoading: userLoading } = useUserProfile();
  const router = useRouter();
  const [bundles, setBundles] = useState<BundlePurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBundles() {
      try {
        const response = await fetch('/api/ai-tutors/bundles/my-bundles');

        if (!response.ok) {
          throw new Error('Failed to fetch bundles');
        }

        const data = await response.json();
        setBundles(data.bundles || []);
      } catch (error) {
        console.error('Error fetching bundles:', error);
        toast.error('Failed to load your bundles');
      } finally {
        setIsLoading(false);
      }
    }

    if (user && !userLoading) {
      fetchBundles();
    }
  }, [user, userLoading]);

  if (userLoading || isLoading) {
    return <div className={styles.loading}>Loading your bundles...</div>;
  }

  if (!user) {
    router.push('/login?redirect=/ai-tutors/my-bundles');
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Session Bundles</h1>
        <p className={styles.subtitle}>
          View and manage your active AI tutor session bundles
        </p>
      </div>

      {bundles.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📦</div>
          <h2>No Active Bundles</h2>
          <p>You haven't purchased any session bundles yet.</p>
          <a href="/marketplace" className={styles.browseLink}>
            Browse AI Tutors
          </a>
        </div>
      ) : (
        <div className={styles.grid}>
          {bundles.map(bundle => (
            <BundleCard key={bundle.id} purchase={bundle} />
          ))}
        </div>
      )}
    </div>
  );
}

interface BundleCardProps {
  purchase: BundlePurchase;
}

function BundleCard({ purchase }: BundleCardProps) {
  const expiresAt = purchase.expires_at ? new Date(purchase.expires_at) : null;
  const daysRemaining = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const totalSessions = purchase.ai_sessions_remaining + purchase.human_sessions_remaining;
  const totalOriginalSessions = purchase.bundle.ai_sessions_count + purchase.bundle.human_sessions_count;
  const usagePercentage = Math.round(((totalOriginalSessions - totalSessions) / totalOriginalSessions) * 100);

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>{purchase.bundle.bundle_name}</h3>
          <p className={styles.tutorName}>{purchase.ai_tutor.name}</p>
        </div>
        {purchase.bundle.badge_text && (
          <div className={styles.badge}>{purchase.bundle.badge_text}</div>
        )}
      </div>

      {/* Sessions Progress */}
      <div className={styles.progress}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${usagePercentage}%` }}
          />
        </div>
        <div className={styles.progressText}>
          {totalSessions} of {totalOriginalSessions} sessions remaining
        </div>
      </div>

      {/* Session Breakdown */}
      <div className={styles.sessions}>
        <div className={styles.sessionItem}>
          <span className={styles.sessionIcon}>🤖</span>
          <span className={styles.sessionCount}>{purchase.ai_sessions_remaining}</span>
          <span className={styles.sessionLabel}>AI sessions</span>
        </div>
        <div className={styles.sessionItem}>
          <span className={styles.sessionIcon}>👤</span>
          <span className={styles.sessionCount}>{purchase.human_sessions_remaining}</span>
          <span className={styles.sessionLabel}>Human sessions</span>
        </div>
      </div>

      {/* Expiration */}
      {daysRemaining !== null && (
        <div className={styles.expiration}>
          <span className={styles.expirationIcon}>⏰</span>
          <span className={styles.expirationText}>
            {daysRemaining === 0 ? 'Expires today' : `Expires in ${daysRemaining} days`}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <a
          href={`/ai-tutors/${purchase.ai_tutor.id}`}
          className={styles.actionButton}
        >
          Start Session
        </a>
      </div>
    </div>
  );
}
