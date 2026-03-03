/**
 * Filename: AIAgentHeroSection.tsx
 * Purpose: Hero section for public AI tutor profile — copied from ProfileHeroSection, customised for AI
 * Created: 2026-03-03
 *
 * Differences from ProfileHeroSection:
 * - "AI Tutor" badge instead of CaaS score
 * - "Available 24/7" instead of location
 * - No video badge, no Free Help badge
 * - Blue gradient avatar (variant='ai-agent')
 * - Creator attribution line for third-party agents
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Heart, Share2, Gift, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { ShareModal } from '@/app/components/ui/feedback/ShareModal';
import { quickSaveItem, isItemSaved } from '@/lib/api/wiselists';
import getProfileImageUrl from '@/lib/utils/image';
import styles from './AIAgentHeroSection.module.css';

export interface AIAgentPublicProfile {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  avatar_url?: string;
  subject: string;
  price_per_hour: number;
  status: string;
  avg_rating?: number;
  total_reviews?: number;
  total_sessions?: number;
  is_platform_owned: boolean;
  created_at: string;
  view_count?: number;
  skills: string[];
  owner?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    identity_verified: boolean;
    slug?: string | null;
  } | null;
}

interface AIAgentHeroSectionProps {
  agent: AIAgentPublicProfile;
}

export function AIAgentHeroSection({ agent }: AIAgentHeroSectionProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const { profile: currentUser } = useUserProfile();
  const router = useRouter();

  // Check saved status
  useEffect(() => {
    const checkSaved = async () => {
      try {
        // AI agents use a different save key — for now we skip (wiselists are profile-based)
        setIsSaved(false);
      } catch {
        // ignore
      }
    };
    checkSaved();
  }, [currentUser, agent.id]);

  const imageUrl = getProfileImageUrl(
    { id: agent.id, avatar_url: agent.avatar_url, full_name: agent.display_name },
    true,       // first-2-chars initials
    undefined,
    'ai-agent'  // blue gradient
  );

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: extend wiselist to support ai_agent items
      setIsSaved(!isSaved);
      toast.success(isSaved ? 'Removed from saves' : 'Saved!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReferEarn = async () => {
    if (!currentUser) {
      toast('Sign up to start earning 10% commission!', { icon: '🎁', duration: 4000 });
      router.push(`/signup?intent=refer&redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (!currentUser.referral_code) {
      toast.error('Referral code not found. Please contact support.');
      return;
    }

    try {
      const origin = window.location.origin;
      const profilePath = window.location.pathname;
      const referralUrl = `${origin}/a/${currentUser.referral_code}?redirect=${encodeURIComponent(profilePath)}`;
      await navigator.clipboard.writeText(referralUrl);
      toast.success('Referral link copied! Share it to earn 10% commission.');
    } catch {
      toast.error('Failed to copy referral link');
    }
  };

  return (
    <div className={styles.heroSection}>
      <div className={styles.banner}>
        {/* Utility Actions (top-right) */}
        <div className={styles.utilityActions}>
          <button
            onClick={handleSave}
            className={styles.iconButton}
            aria-label={isSaved ? 'Remove from saved' : 'Save AI tutor'}
            disabled={isLoading}
          >
            <Heart size={20} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className={styles.iconButton}
            aria-label="Share AI tutor"
          >
            <Share2 size={20} />
          </button>
        </div>

        {/* Avatar (left) */}
        <div className={styles.avatarContainer}>
          <Image
            src={imageUrl}
            alt={agent.display_name}
            className={styles.avatar}
            width={192}
            height={192}
          />
          {/* AI badge overlay */}
          <div className={styles.aiBadgeOverlay}>
            <Zap size={14} />
            AI
          </div>
        </div>

        {/* Info (center) */}
        <div className={styles.infoContainer}>
          {/* Line 1: Name */}
          <h1 className={styles.fullName}>{agent.display_name}</h1>

          {/* Line 2: AI Tutor badge */}
          <div className={styles.aiBadgeRow}>
            <span className={styles.aiTutorBadge}>
              <Zap size={15} />
              AI Tutor
            </span>
            {agent.is_platform_owned && (
              <span className={styles.platformBadge}>Tutorwise Official</span>
            )}
          </div>

          {/* Line 3: Availability | Subject */}
          <div className={styles.roleLine}>
            <span className={styles.availabilityText}>Available 24/7</span>
            <span className={styles.separator}>|</span>
            <span className={styles.subjectText}>{agent.subject}</span>
          </div>

          {/* Line 4: Creator attribution (third-party agents only) */}
          {agent.owner && !agent.is_platform_owned && (
            <div className={styles.creatorLine}>
              Created by{' '}
              <a
                href={`/public-profile/${agent.owner.id}${agent.owner.slug ? `/${agent.owner.slug}` : ''}`}
                className={styles.creatorLink}
              >
                {agent.owner.full_name}
              </a>
              {agent.owner.identity_verified && (
                <span className={styles.verifiedBadge}>Verified Tutor</span>
              )}
            </div>
          )}
        </div>

        {/* Primary CTA (bottom-right) */}
        <div className={styles.primaryCTA}>
          <button onClick={handleReferEarn} className={styles.referButton}>
            <Gift size={20} />
            Refer & Earn 10%
          </button>
        </div>
      </div>

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={`${agent.display_name} — AI Tutor`}
        url={typeof window !== 'undefined' ? window.location.href : ''}
        text={agent.description || `Try ${agent.display_name} on Tutorwise`}
      />
    </div>
  );
}
