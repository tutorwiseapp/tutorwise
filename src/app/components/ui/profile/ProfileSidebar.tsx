import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { User } from '@/types';
import Card from '../ui/Card';
import styles from './ProfileSidebar.module.css';

interface ProfileSidebarProps {
  user: Partial<User>; // Use Partial<User> as some data might be missing
}

const getProfileImageUrl = (user: Partial<User>) => {
    if (user.customPictureUrl) return user.customPictureUrl;
    if (user.email) {
        // In a real app, use a proper MD5 library
        const emailHash = 'd41d8cd98f00b204e9800998ecf8427e'; // Placeholder hash
        return `https://www.gravatar.com/avatar/${emailHash}?d=mp&s=150`;
    }
    return `https://i.pravatar.cc/150`; // Fallback
};

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
        <h2 className={styles.displayName}>{user.displayName}</h2>
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