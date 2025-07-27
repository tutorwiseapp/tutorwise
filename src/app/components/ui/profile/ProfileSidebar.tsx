/*
 * Filename: src/app/components/ui/profile/ProfileSidebar.tsx
 * Purpose: A reusable sidebar component to display a user's key profile information.
 * Change History:
 * C008 - 2025-07-27 : 11:00 - Restored usage of the getProfileImageUrl utility.
 * ... (previous history)
 * Last Modified: 2025-07-27 : 11:00
 * Requirement ID: VIN-UI-013
 * Change Summary: The component now correctly imports and uses the restored `getProfileImageUrl`
 * utility. This change, combined with the restoration of the utility itself, ensures that
 * profile pictures are rendered correctly and consistently.
 * Impact Analysis: This restores the component to its original, fully functional state.
 * Dependencies: "@/types", "next/image", "next/link", "./ProfileSidebar.module.css", "@/lib/utils/image".
 */
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Profile } from '@/types';
import Card from '@/app/components/ui/Card';
import styles from './ProfileSidebar.module.css';
import getProfileImageUrl from '@/lib/utils/image'; // This import is now restored

interface ProfileSidebarProps {
  user: Partial<Profile>;
  isOwnProfile?: boolean;
}

const ProfileSidebar = ({ user, isOwnProfile = false }: ProfileSidebarProps) => {
  const status = "Active";
  const role = user.roles && user.roles.length > 0 ? user.roles[0] : 'agent';

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
        
        <div className={styles.nameBlock}>
          <h2 className={styles.displayName}>{user.display_name || 'Vinite User'}</h2>
          <p className={styles.agentId}>{user.agent_id}</p>
        </div>
        
        <div className={styles.linkGroup}>
          {isOwnProfile && (
            <Link href="/profile" className={styles.textLink}>
              Edit Public Profile
            </Link>
          )}
          {user.agent_id && (
            <Link href={`/agents/${user.agent_id}`} className={styles.textLink}>
              View Public Profile
            </Link>
          )}
        </div>
        
        <div className={styles.statsCard}>
          <div className={styles.statItem}>
            <span className={styles.label}>Role</span>
            <span className={styles.value} style={{ textTransform: 'capitalize' }}>{role}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.label}>Status</span>
            <span className={styles.value}>{status}</span>
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