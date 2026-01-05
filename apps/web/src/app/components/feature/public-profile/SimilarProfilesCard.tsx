/**
 * Filename: SimilarProfilesCard.tsx
 * Purpose: Similar/Related profiles recommendation card
 * Created: 2025-11-12
 *
 * Displays recommended profiles based on:
 * - Same role (tutor/agent/client)
 * - Similar subjects
 * - Same location/city
 */

'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { Profile } from '@/types';
import Card from '@/app/components/ui/data-display/Card';
import { MapPin, Star } from 'lucide-react';
import styles from './SimilarProfilesCard.module.css';

interface SimilarProfilesCardProps {
  profiles: SimilarProfile[];
}

interface SimilarProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  city?: string;
  active_role: string;
  slug?: string;
  professional_details?: {
    tutor?: { subjects?: string[] };
    provider?: { subjects?: string[] };
    client?: { subjects?: string[] };
    agent?: { services?: string[] };
  };
  average_rating?: number;
  total_reviews?: number;
}

export function SimilarProfilesCard({ profiles = [] }: SimilarProfilesCardProps) {
  const router = useRouter();

  const handleProfileClick = (profile: SimilarProfile) => {
    const slug = profile.slug || profile.full_name?.toLowerCase().replace(/\s+/g, '-') || profile.id;
    router.push(`/public-profile/${profile.id}/${slug}`);
  };

  // Always show card, even with empty state
  return (
    <Card className={styles.card}>
      {/* Teal header section matching standard card pattern */}
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>You might also like</h2>
      </div>

      {/* Card content section */}
      <div className={styles.cardContent}>
        {/* Empty state */}
        {(!profiles || profiles.length === 0) ? (
          <p className={styles.emptyMessage}>No matching profiles or listings yet.</p>
        ) : (
          <div className={styles.profilesGrid}>
            {profiles.map((profile) => {
              const roleLabel = profile.active_role === 'tutor' ? 'Tutor'
                : profile.active_role === 'agent' ? 'Agent'
                : 'Client';

              // Get primary subject/service
              const tutorDetails = profile.professional_details?.tutor;
              const clientDetails = profile.professional_details?.client;
              const agentDetails = profile.professional_details?.agent;

              const primaryItem = tutorDetails?.subjects?.[0] ||
                                 clientDetails?.subjects?.[0] ||
                                 agentDetails?.services?.[0] ||
                                 null;

              return (
                <button
                  key={profile.id}
                  className={styles.profileCard}
                  onClick={() => handleProfileClick(profile)}
                  type="button"
                >
                  {/* Avatar */}
                  <div className={styles.avatarContainer}>
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        width={48}
                        height={48}
                        alt={profile.full_name}
                        className={styles.avatar}
                      />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {profile.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>

                  {/* Profile Info */}
                  <div className={styles.profileInfo}>
                    <h3 className={styles.profileName}>{profile.full_name}</h3>
                    <p className={styles.profileRole}>{roleLabel}</p>

                    {/* Primary Subject/Service */}
                    {primaryItem && (
                      <p className={styles.primaryItem}>{primaryItem}</p>
                    )}

                    {/* Location */}
                    {profile.city && (
                      <div className={styles.location}>
                        <MapPin size={14} />
                        {profile.city}
                      </div>
                    )}

                    {/* Rating (if available) */}
                    {profile.average_rating && profile.total_reviews ? (
                      <div className={styles.rating}>
                        <Star size={14} fill="#fbbf24" stroke="#fbbf24" />
                        <span className={styles.ratingValue}>
                          {profile.average_rating.toFixed(1)}
                        </span>
                        <span className={styles.reviewCount}>
                          ({profile.total_reviews})
                        </span>
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
