/**
 * Filename: SimilarOrganisationsCard.tsx
 * Purpose: Display similar organisations for discovery
 * Created: 2025-12-31
 */

'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Building2, MapPin, Star, Users } from 'lucide-react';
import { getInitials } from '@/lib/utils/initials';
import styles from './SimilarOrganisationsCard.module.css';

interface Organisation {
  id: string;
  name: string;
  slug: string;
  avatar_url?: string;
  logo_url?: string;
  location_city?: string;
  tagline?: string;
  caas_score?: number;
  avg_rating?: number;
  total_tutors?: number;
}

interface SimilarOrganisationsCardProps {
  organisations: Organisation[];
  currentOrganisationId: string;
}

export function SimilarOrganisationsCard({
  organisations,
  currentOrganisationId,
}: SimilarOrganisationsCardProps) {
  const router = useRouter();

  // Filter out current organisation and limit to 6
  const filteredOrgs = organisations
    .filter(org => org.id !== currentOrganisationId)
    .slice(0, 6);

  const handleOrgClick = (org: Organisation) => {
    router.push(`/organisation/${org.slug}`);
  };

  const getTrustBadge = (score?: number) => {
    if (!score) return null;
    if (score >= 90) return { label: 'Top 5%', color: '#006c67' };
    if (score >= 80) return { label: 'Top 10%', color: '#006c67' };
    return null;
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Similar Organisations</h2>
        <p className={styles.subtitle}>
          Discover other top-rated tutoring organisations
        </p>
      </div>

      <div className={styles.grid}>
        {filteredOrgs.map((org) => {
          const initials = getInitials(org.name);
          const trustBadge = getTrustBadge(org.caas_score);
          const logoUrl = org.logo_url || org.avatar_url;

          return (
            <button
              key={org.id}
              className={styles.orgCard}
              onClick={() => handleOrgClick(org)}
              aria-label={`View ${org.name}'s profile`}
            >
              {/* Logo */}
              <div className={styles.logoWrapper}>
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={org.name}
                    width={80}
                    height={80}
                    className={styles.logo}
                  />
                ) : (
                  <div className={styles.logoFallback}>
                    <Building2 size={32} />
                  </div>
                )}
              </div>

              {/* Organisation Info */}
              <div className={styles.info}>
                <h3 className={styles.name}>{org.name}</h3>

                {/* Trust Badge */}
                {trustBadge && (
                  <div
                    className={styles.trustBadge}
                    style={{ backgroundColor: `${trustBadge.color}15`, color: trustBadge.color }}
                  >
                    {trustBadge.label}
                  </div>
                )}

                {/* Tagline */}
                {org.tagline && (
                  <p className={styles.tagline}>{org.tagline}</p>
                )}

                {/* Stats */}
                <div className={styles.stats}>
                  {org.avg_rating && org.avg_rating > 0 && (
                    <div className={styles.statItem}>
                      <Star size={14} fill="#fbbf24" color="#fbbf24" />
                      <span>{org.avg_rating.toFixed(1)}</span>
                    </div>
                  )}

                  {org.total_tutors && org.total_tutors > 0 && (
                    <div className={styles.statItem}>
                      <Users size={14} />
                      <span>{org.total_tutors} tutors</span>
                    </div>
                  )}

                  {org.location_city && (
                    <div className={styles.statItem}>
                      <MapPin size={14} />
                      <span>{org.location_city}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Hover Overlay */}
              <div className={styles.hoverOverlay}>
                <span>View Profile →</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
