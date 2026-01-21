/**
 * Filename: apps/web/src/app/components/resources/embeds/TutorCarousel.tsx
 * Purpose: MDX component for embedding a horizontal tutor carousel in resource articles
 * Created: 2026-01-16
 *
 * Usage in MDX:
 * <TutorCarousel profileIds={["uuid1", "uuid2", "uuid3"]} />
 * <TutorCarousel profileIds={["uuid1", "uuid2"]} autoplay={true} interval={5000} />
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import TutorProfileCard from '@/app/components/feature/marketplace/TutorProfileCard';
import { useSignalTracking } from './useSignalTracking';
import styles from './TutorCarousel.module.css';

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

interface TutorCarouselProps {
  profileIds: string[];
  autoplay?: boolean;
  interval?: number; // milliseconds
  showDots?: boolean;
  articleId?: string;
}

/**
 * TutorCarousel Component
 *
 * Horizontal scrollable carousel of tutor profiles with attribution tracking.
 */
export default function TutorCarousel({
  profileIds,
  autoplay = false,
  interval = 5000,
  showDots = true,
  articleId,
}: TutorCarouselProps) {
  const [profiles, setProfiles] = useState<TutorProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Get article ID from URL if not provided
  const currentArticleId =
    articleId ||
    (typeof window !== 'undefined' ? window.location.pathname.split('/resources/')[1]?.split('/')[0] : '');

  const { trackEvent } = useSignalTracking(currentArticleId || '', 'tutor_carousel', 'article', 0);

  // Fetch profiles on mount
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        setError(null);

        const promises = profileIds.map((id) => fetch(`/api/v1/profiles/${id}`).then((r) => r.json()));

        const results = await Promise.all(promises);
        const fetchedProfiles = results
          .map((r) => r.profile || r)
          .filter((p) => p && p.id); // Filter out any failed fetches

        setProfiles(fetchedProfiles);
      } catch (err) {
        console.error('[TutorCarousel] Error fetching profiles:', err);
        setError('Unable to load tutors');
      } finally {
        setLoading(false);
      }
    };

    if (profileIds && profileIds.length > 0) {
      fetchProfiles();
    }
  }, [profileIds]);

  // Autoplay functionality
  useEffect(() => {
    if (!autoplay || profiles.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % profiles.length);
    }, interval);

    return () => clearInterval(timer);
  }, [autoplay, interval, profiles.length]);

  // Scroll carousel when index changes
  useEffect(() => {
    if (carouselRef.current) {
      const scrollWidth = carouselRef.current.scrollWidth / profiles.length;
      carouselRef.current.scrollTo({
        left: scrollWidth * currentIndex,
        behavior: 'smooth',
      });
    }
  }, [currentIndex, profiles.length]);

  // Track click when user clicks a tutor card
  const handleProfileClick = (profile: TutorProfile) => {
    if (currentArticleId && profile.id) {
      trackEvent({
        eventType: 'click',
        targetType: 'tutor',
        targetId: profile.id,
        metadata: {
          context: 'embed_carousel',
        },
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('[TutorCarousel] Attribution tracked:', {
          articleId: currentArticleId,
          profileId: profile.id,
          context: 'embed_carousel',
        });
      }
    }
  };

  // Navigation handlers
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + profiles.length) % profiles.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % profiles.length);
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.carouselContainer}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Loading tutors...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || profiles.length === 0) {
    return (
      <div className={styles.carouselContainer}>
        <div className={styles.errorState}>
          <p className={styles.errorText}>{error || 'No tutors found'}</p>
        </div>
      </div>
    );
  }

  // Success: Render carousel
  return (
    <div className={styles.carouselContainer}>
      <div className={styles.carouselWrapper}>
        {/* Previous button */}
        {profiles.length > 1 && (
          <button className={`${styles.navButton} ${styles.navPrev}`} onClick={handlePrev}>
            ←
          </button>
        )}

        {/* Carousel track */}
        <div className={styles.carouselTrack} ref={carouselRef}>
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={styles.carouselSlide}
              onClick={() => handleProfileClick(profile)}
            >
              <TutorProfileCard profile={profile} />
            </div>
          ))}
        </div>

        {/* Next button */}
        {profiles.length > 1 && (
          <button className={`${styles.navButton} ${styles.navNext}`} onClick={handleNext}>
            →
          </button>
        )}
      </div>

      {/* Dots indicator */}
      {showDots && profiles.length > 1 && (
        <div className={styles.dotsContainer}>
          {profiles.map((_, index) => (
            <button
              key={index}
              className={`${styles.dot} ${index === currentIndex ? styles.dotActive : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
