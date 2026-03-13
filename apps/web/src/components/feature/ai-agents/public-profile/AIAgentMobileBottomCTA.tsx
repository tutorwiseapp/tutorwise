/**
 * Filename: AIAgentMobileBottomCTA.tsx
 * Purpose: Fixed bottom CTA bar for mobile on AI tutor public profile
 * Created: 2026-03-03
 *
 * Copied from MobileBottomCTA.tsx, simplified to a single "Start Session" button.
 * No message button — AI tutors are not messaged directly.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import Button from '@/components/ui/actions/Button';
import type { AIAgentPublicProfile } from './AIAgentHeroSection';
import styles from './AIAgentMobileBottomCTA.module.css';

interface AIAgentMobileBottomCTAProps {
  agent: AIAgentPublicProfile;
}

export function AIAgentMobileBottomCTA({ agent }: AIAgentMobileBottomCTAProps) {
  const router = useRouter();
  const { profile: currentUser } = useUserProfile();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartSession = async () => {
    if (!currentUser) {
      toast.error('Please sign in to start a session');
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

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
      toast.error(error.message || 'Failed to start session');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.mobileBottomCTA}>
      <div className={styles.ctaContainer}>
        <div className={styles.priceInfo}>
          <span className={styles.priceValue}>
            {agent.price_per_hour ? `£${agent.price_per_hour}/hr` : 'Free'}
          </span>
          <span className={styles.priceLabel}>per session</span>
        </div>
        <Button
          variant="primary"
          onClick={handleStartSession}
          disabled={isLoading}
          className={styles.ctaButton}
        >
          <Zap size={18} />
          {isLoading ? 'Processing...' : 'Start Session'}
        </Button>
      </div>
    </div>
  );
}
