/**
 * Filename: apps/web/src/app/components/resources/embeds/TutorEmbed.tsx
 * Purpose: MDX component for embedding tutor profiles in resource articles with event tracking
 * Created: 2026-01-16
 * Updated: 2026-01-16 - Migrated to event-based attribution
 *
 * Usage in MDX:
 * <TutorEmbed profileId="uuid" context="recommended" position={0} />
 * <TutorEmbed profileId="uuid" context="featured" showBio={true} position={1} />
 *
 * Event tracking: Records 'click' events when user clicks embedded tutor card.
 * Position parameter enables performance comparison (e.g., "position 0 vs position 1").
 */

'use client';

import { useState, useEffect } from 'react';
import TutorProfileCard from '@/app/components/feature/marketplace/TutorProfileCard';
import { useSignalTracking } from './useSignalTracking';
import styles from './TutorEmbed.module.css';

interface TutorProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  city?: string;
  identity_verified?: boolean;
  dbs_verified?: boolean;
  available_free_help?: boolean;
  listing_count?: number;
  average_rating?: number;
  review_count?: number;
  subjects?: string[];
  levels?: string[];
  delivery_modes?: string[];
  min_hourly_rate?: number;
  max_hourly_rate?: number;
}

interface TutorEmbedProps {
  profileId: string;
  context?: 'recommended' | 'author' | 'featured';
  showBio?: boolean;
  articleId?: string; // Optionally passed from MDX context
  position?: number; // Zero-indexed position in article (for performance tracking)
}

/**
 * TutorEmbed Component
 *
 * Embeds a tutor profile card in resource articles with signal-based journey tracking.
 * When user clicks the card, writes 'click' event to signal_events table with signal_id.
 */
export default function TutorEmbed({
  profileId,
  context = 'recommended',
  showBio = false,
  articleId,
  position = 0,
}: TutorEmbedProps) {
  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Get article ID from URL if not provided
  const currentArticleId =
    articleId ||
    (typeof window !== 'undefined' ? window.location.pathname.split('/resources/')[1]?.split('/')[0] : '');

  const { trackEvent, embedInstanceId } = useSignalTracking(currentArticleId || '', 'tutor_embed', 'article', position);

  // Fetch tutor profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/v1/profiles/${profileId}`);

        if (!response.ok) {
          throw new Error('Failed to load tutor profile');
        }

        const data = await response.json();
        setProfile(data.profile || data);
      } catch (err) {
        console.error('[TutorEmbed] Error fetching profile:', err);
        setError('Unable to load tutor profile');
      } finally {
        setLoading(false);
      }
    };

    if (profileId) {
      fetchProfile();
    }
  }, [profileId]);

  // Track click event when user clicks the tutor card
  const handleClick = async () => {
    if (currentArticleId && profileId) {
      // Write 'click' event to signal_events table with signal_id
      await trackEvent({
        eventType: 'click',
        targetType: 'tutor',
        targetId: profileId,
        metadata: {
          context, // 'recommended', 'author', 'featured'
          tutor_name: profile?.full_name,
          embed_instance_id: embedInstanceId,
        },
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.embedContainer}>
        <div className={styles.loadingCard}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Loading tutor...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <div className={styles.embedContainer}>
        <div className={styles.errorCard}>
          <p className={styles.errorText}>{error || 'Tutor not found'}</p>
        </div>
      </div>
    );
  }

  // Success: Render tutor card
  return (
    <div className={styles.embedContainer} onClick={handleClick}>
      <div className={styles.embedHeader}>
        <span className={styles.embedLabel}>
          {context === 'recommended' && '✨ Recommended Tutor'}
          {context === 'author' && '✍️ Article Author'}
          {context === 'featured' && '⭐ Featured Tutor'}
        </span>
      </div>

      <TutorProfileCard profile={profile} />

      {showBio && profile.bio && (
        <div className={styles.bioSection}>
          <p className={styles.bioText}>{profile.bio}</p>
        </div>
      )}
    </div>
  );
}
