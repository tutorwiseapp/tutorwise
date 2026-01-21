/**
 * Filename: MobileBottomCTA.tsx
 * Purpose: Fixed bottom CTA bar for mobile devices
 * Created: 2025-12-31
 */

'use client';

import { useRouter } from 'next/navigation';
import { Calendar, Briefcase } from 'lucide-react';
import styles from './MobileBottomCTA.module.css';

interface MobileBottomCTAProps {
  organisation: any;
  isOwner: boolean;
}

export function MobileBottomCTA({ organisation, isOwner }: MobileBottomCTAProps) {
  const router = useRouter();

  // Don't show for owners
  if (isOwner) {
    return null;
  }

  const handleBookSession = () => {
    // Navigate to booking flow with organisation context
    router.push(`/marketplace?organisation=${organisation.id}`);
  };

  const handleJoinTeam = () => {
    // Navigate to careers/join page
    if (organisation.careers_url) {
      window.open(organisation.careers_url, '_blank');
    } else {
      router.push(`/organisation/${organisation.slug}/join`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Book Session Button */}
        <button
          className={`${styles.ctaButton} ${styles.primaryButton}`}
          onClick={handleBookSession}
          aria-label="Book a session"
        >
          <Calendar size={20} />
          <span>Book Session</span>
        </button>

        {/* Join Team Button */}
        <button
          className={`${styles.ctaButton} ${styles.secondaryButton}`}
          onClick={handleJoinTeam}
          aria-label="Join our team"
        >
          <Briefcase size={20} />
          <span>Join Team</span>
        </button>
      </div>
    </div>
  );
}
