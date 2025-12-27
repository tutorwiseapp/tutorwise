/*
 * Filename: src/app/components/ui/profile/ProfileCard/ProfileCard.tsx
 * Purpose: A reusable component to display a user's detailed public profile information.
 *
 * Change History:
 * C002 - 2025-07-20 : 07:00 - Applied new standard header format and corrected property accessors to snake_case.
 * C001 - 2024-07-17 : 13:40 - Initial creation of the component.
 *
 * Last Modified: 2025-07-20 : 07:00
 * Requirement ID: VIN-A-01.2
 *
 * Change Summary:
 * Updated the component to use snake_case for all properties (e.g., agent.full_name) to align with the
 * canonical Profile interface. This also involved applying the new, detailed header format for documentation.
 *
 * Impact Analysis:
 * This change ensures the public profile card correctly displays data fetched from the mock DataProvider. It's a
 * critical part of fixing the "Agent Not Found" user journey.
 *
 * Dependencies:
 * - react, next/link, next/image
 * - @/types
 * - @/app/components/ui/Card
 * - ./ProfileCard.module.css
 * - @/lib/utils/image
 *
 * Props:
 * - agent: A partial User/Profile object for the agent whose profile is being displayed.
 * - isOwnProfile: A boolean to conditionally render the "Edit Profile" link.
 *
 * TODO: None
 */
'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Profile } from '@/types';
import Card from '@/app/components/ui/data-display/Card';
import getProfileImageUrl from '@/lib/utils/image';
import { formatIdForDisplay } from '@/lib/utils/formatId';
import styles from './ProfileCard.module.css';

interface ProfileCardProps {
  agent: Partial<Profile>;
  isOwnProfile?: boolean;
}

export const ProfileCard = ({ agent, isOwnProfile = false }: ProfileCardProps) => {
  return (
    <Card className={styles.profileCard}>
      <div 
        className={styles.coverPhoto} 
        style={{ backgroundImage: agent.cover_photo_url ? `url(${agent.cover_photo_url})` : 'none' }}
      />
      <div className={styles.avatarContainer}>
        <Image
          src={getProfileImageUrl(agent)}
          alt={`${agent.full_name || 'Agent'}'s profile picture`}
          width={150}
          height={150}
          className={styles.profileAvatar}
        />
      </div>
      <div className={styles.profileBody}>
        <h2 className={styles.profileName}>{agent.full_name}</h2>
        <p className={styles.profileId}>ID: {agent.referral_id || (agent.id && formatIdForDisplay(agent.id))}</p>
        {isOwnProfile && <Link href="/account/personal-info" className={styles.editProfileLink}>Edit Profile</Link>}
        
        <div className={styles.detailsSection}>
          <h3>About</h3>
          <p>{agent.bio || 'No bio provided.'}</p>
        </div>
        <div className={styles.detailsSection}>
          <h3>Specialties</h3>
          <div className={styles.tagContainer}>
            {agent.categories ? agent.categories.split(',').map(cat => (
              <span key={cat.trim()} className={styles.tag}>{cat.trim()}</span>
            )) : <p className={styles.noDataText}>Not specified.</p>}
          </div>
        </div>
        <div className={styles.detailsSection}>
          <h3>Achievements</h3>
          <p>{agent.achievements || 'No achievements listed.'}</p>
        </div>
      </div>
    </Card>
  );
};
export default ProfileCard;
