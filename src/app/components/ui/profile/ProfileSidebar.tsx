/**
 * Filename: src/app/profile/ProfileSidebar.tsx
 * Purpose: A reusable sidebar component to display a user's key profile information.
 *
 * Change History:
 * C001 - 2024-07-17 : 13:40 - Refactored to use Profile interface and fix public profile link.
 *
 * Last Modified: 2024-07-17
 * Requirement ID: VIN-A-01.2
 * Change Summary: Updated the component to accept a 'Profile' object. All internal data access now uses snake_case properties (e.g., user.display_name). The "View Public Profile" link is now correctly constructed using user.agent_id.
 * Impact Analysis: This component is now correctly integrated with the central data model and the application's routing.
 * Dependencies: src/types/index.ts, next/image, next/link
 * Props: user: The Profile object to display.
 */

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Profile } from '@/types'; // --- CHANGE: Import Profile
import Card from '@/app/components/ui/Card';
import styles from './ProfileSidebar.module.css';
import getProfileImageUrl from '@/lib/utils/image';

interface ProfileSidebarProps {
  user: Partial<Profile>; // Use Partial to handle potentially incomplete objects
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
        {/* --- CHANGE: Use snake_case properties --- */}
        <h2 className={styles.displayName}>{user.display_name || 'Agent'}</h2>
        <p className={styles.agentId}>{user.agent_id}</p>
        
        {/* --- FIX: Correctly construct the link --- */}
        {user.agent_id && (
          <Link href={`/agents/${user.agent_id}`} className={styles.textLink}>
            View Public Profile
          </Link>
        )}
        
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