/**
 * Filename: AIAgentStartSessionCard.tsx
 * Purpose: "Start Session" CTA card for AI tutor public profile sidebar
 * Created: 2026-03-03
 *
 * Replaces GetInTouchCard. Initiates Stripe checkout per-session.
 * - Login required
 * - Creator cannot book own agent
 * - Calls /api/stripe/create-ai-session-checkout
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import Card from '@/components/ui/data-display/Card';
import Button from '@/components/ui/actions/Button';
import type { AIAgentPublicProfile } from './AIAgentHeroSection';
import styles from './AIAgentStartSessionCard.module.css';

interface AIAgentStartSessionCardProps {
  agent: AIAgentPublicProfile;
}

export function AIAgentStartSessionCard({ agent }: AIAgentStartSessionCardProps) {
  const router = useRouter();
  const { profile: currentUser } = useUserProfile();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartSession = async () => {
    if (!currentUser) {
      toast.error('Please sign in to start a session');
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // Prevent creator from booking their own agent
    if (agent.owner?.id && currentUser.id === agent.owner.id) {
      toast.error('You cannot book a session with your own AI tutor');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/create-ai-session-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agent.id, agent_name: agent.name }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error: any) {
      console.error('Start session failed:', error);
      toast.error(error.message || 'Failed to start session. Please try again.');
      setIsLoading(false);
    }
    // Don't reset isLoading on success — user is being redirected
  };

  return (
    <Card className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>Start Learning</h3>
      </div>

      <div className={styles.cardContent}>
        {/* Price display */}
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>Session rate</span>
          <span className={styles.priceValue}>
            {agent.price_per_hour ? `£${agent.price_per_hour}/hr` : 'Free'}
          </span>
        </div>

        {/* Availability */}
        <div className={styles.availabilityRow}>
          <Zap size={14} className={styles.availabilityIcon} />
          <span className={styles.availabilityText}>Available 24/7 — start instantly</span>
        </div>

        {/* CTA */}
        <Button
          variant="primary"
          fullWidth
          onClick={handleStartSession}
          disabled={isLoading}
          className={styles.primaryButton}
        >
          {isLoading
            ? 'Processing...'
            : agent.price_per_hour
              ? `Start Session — £${agent.price_per_hour}/hr`
              : 'Start Session'}
        </Button>

        {/* Payment trust note */}
        <p className={styles.trustNote}>
          Secure payment via Stripe. Cancel any time.
        </p>
      </div>
    </Card>
  );
}
