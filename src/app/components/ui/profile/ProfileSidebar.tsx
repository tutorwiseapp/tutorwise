import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { User } from '@/types';

// --- THIS IS THE FIX ---
// The path now correctly goes up one level ('..') from the 'profile' directory
// and then directly to 'Card.tsx'.
import Card from '../Card'; 
import styles from './ProfileSidebar.module.css';
import getProfileImageUrl from '@/lib/utils/image';

interface ProfileSidebarProps {
  user: Partial<User>;
}

const ProfileSidebar = ({ user }: ProfileSidebarProps) => {
  return (
    <aside>
      <Card className={styles.sidebarCard}>
        <Image
          src={getProfileImageUrl(user)}
          alt="Profile Picture"
          width={150}
          height={150}
          className={styles.profilePicture}
        />
        <h2 className={styles.displayName}>{user.displayName || 'Agent'}</h2>
        <p className={styles.agentId}>{user.agentId}</p>
        <Link href={`/agents/${user.agentId}`} className={styles.textLink}>
          View Public Profile
        </Link>
        
        <div className={styles.statsCard}>
          <div className={styles.statItem}>
            <span className={styles.label}>Status</span>
            <span className={styles.value}>New Agent</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.label}>Total Referrals</span>
            <span className={styles.value}>0</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.label}>Total Earnings</span>
            <span className={styles.value}>£0.00</span>
          </div>
        </div>
      </Card>
    </aside>
  );
};

export default ProfileSidebar;