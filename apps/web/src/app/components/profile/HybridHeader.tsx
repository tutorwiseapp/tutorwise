'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import getProfileImageUrl from '@/lib/utils/image';
import styles from './HybridHeader.module.css';
import type { Listing } from '@tutorwise/shared-types';
import type { Profile } from '@/types';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';

interface HybridHeaderProps {
  listing?: Listing;
  profile?: Profile;
  actionsDisabled?: boolean;
  isEditable?: boolean;
  onUpdate?: (updates: Partial<Profile>) => Promise<void>;
}

export default function HybridHeader({ listing, profile, actionsDisabled = false }: HybridHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useUserProfile();

  const handleActionClick = (action: string) => {
    if (isLoading || actionsDisabled) return;

    if (!user) {
      router.push(`/login?redirect=${pathname}`);
    } else {
      console.log(`TODO: Implement ${action} action`);
    }
  };

  // Support both listing and profile props
  const data = listing || profile;
  if (!data) return null;

  // Use the same profile image logic as NavMenu (includes academic avatar fallback)
  const avatarUrl = getProfileImageUrl({
    id: listing ? listing.profile_id : (profile?.id || ''),
    avatar_url: listing ? listing.avatar_url : (profile?.avatar_url || null),
  });

  const fullName = listing ? listing.full_name : (profile?.full_name || 'Anonymous User');
  const title = listing ? listing.title : (profile?.professional_details?.tutor?.subjects?.[0] || 'Tutor');
  const location = listing ? listing.location_city : (profile?.city || 'United Kingdom');
  const hourlyRate = listing ? listing.hourly_rate : (profile?.professional_details?.tutor?.hourly_rate || 'N/A');

  return (
    <div className={styles.hybridHeader}>
      {/* Left Column: Profile Picture + Info */}
      <div className={styles.leftColumn}>
        <div className={styles.avatarContainer}>
          <img
            src={avatarUrl}
            alt={fullName || title}
            className={styles.avatar}
          />
        </div>
        <div className={styles.profileInfo}>
          <h1 className={styles.tutorName}>{fullName || title}</h1>
          <p className={styles.specialty}>{title}</p>
          <p className={styles.location}>{location}</p>
        </div>
      </div>

      {/* Right Column: Stats + Action Buttons */}
      <div className={styles.rightColumn}>
        {/* Stats Card */}
        <Card className={styles.statsCard}>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <p className={styles.statLabel}>Credibility Score</p>
              <p className={styles.statValue}>75</p>
            </div>
            <div className={styles.statItem}>
              <p className={styles.statLabel}>One-on-One Session Rate</p>
              <p className={styles.statValue}>£{hourlyRate}</p>
            </div>
            <div className={styles.statItem}>
              <p className={styles.statLabel}>Group Session Rate</p>
              <p className={styles.statValue}>£30</p>
            </div>
          </div>
        </Card>

        {/* Action Buttons - 5 buttons in 3-column grid (wraps to 3 top, 2 bottom) */}
        <div className={styles.actionButtons}>
          <Button
            variant="primary"
            onClick={() => handleActionClick('refer')}
          >
            Refer Me
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleActionClick('message')}
          >
            Message Me
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleActionClick('connect')}
          >
            Connect with Me
          </Button>
          <Button
            variant="primary"
            onClick={() => handleActionClick('hire')}
          >
            Hire Me
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleActionClick('instant-booking')}
          >
            Instant Booking
          </Button>
        </div>
      </div>
    </div>
  );
}
