import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { User } from '@/types';
import styles from './ProfileCard.module.css';

interface ProfileCardProps {
  agent: Partial<User>;
  isOwnProfile?: boolean;
}

const getProfileImageUrl = (user: Partial<User>) => {
    if (user.customPictureUrl) return user.customPictureUrl;
    return `https://i.pravatar.cc/150?u=${user.agentId || 'default'}`;
};

const ProfileCard = ({ agent, isOwnProfile = false }: ProfileCardProps) => {
  return (
    <div className={styles.profileCard}>
      <div 
        className={styles.coverPhoto} 
        style={{ backgroundImage: agent.coverPhotoUrl ? `url(${agent.coverPhotoUrl})` : 'none' }}
      />
      <div className={styles.avatarContainer}>
        <Image
          src={getProfileImageUrl(agent)}
          alt={`${agent.displayName || 'Agent'}'s profile picture`}
          width={150}
          height={150}
          className={styles.profileAvatar}
        />
      </div>
      <div className={styles.profileBody}>
        <h2 className={styles.profileName}>{agent.displayName}</h2>
        <p className={styles.profileId}>{agent.agentId}</p>
        {isOwnProfile && <Link href="/profile" className={styles.editProfileLink}>Edit Profile</Link>}
        
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
    </div>
  );
};

export default ProfileCard;