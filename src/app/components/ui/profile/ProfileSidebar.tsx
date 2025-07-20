/*
 * Filename: src/app/components/ui/profile/ProfileSidebar/ProfileSidebar.tsx
 * Purpose: A reusable sidebar component to display a user's key profile information.
 *
 * Change History:
 * C002 - 2025-07-20 : 07:00 - Applied new standard header format and corrected property accessors to snake_case.
 * C001 - 2024-07-17 : 13:40 - Refactored to use Profile interface and fix public profile link.
 *
 * Last Modified: 2025-07-20 : 07:00
 * Requirement ID: VIN-A-01.2
 *
 * Change Summary:
 * Updated the component to use snake_case for all properties (e.g., user.display_name) to align with the
 * canonical Profile interface. This also involved applying the new, detailed header format for documentation.
 *
 * Impact Analysis:
 * This is the critical fix for the bug where user data was not appearing on the dashboard/profile pages.
 * It ensures the component correctly consumes data from the AuthProvider, fixing the broken "View Public Profile" link.
 *
 * Dependencies:
 * - react, next/link, next/image
 * - @/types
 * - @/app/components/ui/Card
 * - ./ProfileSidebar.module.css
 * - @/lib/utils/image
 *
 * Props:
 * - user: A partial User/Profile object containing the data to be displayed.
 *
 * TODO:
 * - The stats (Total Referrals, Total Earnings) are currently hardcoded and will need to be connected to a live data source.
 */
'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { User } from '@/types';
import Card from '@/app/components/ui/Card';
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
        <h2 className={styles.displayName}>{user.display_name || 'Agent'}</h2>
        <p className={styles.agentId}>{user.agent_id}</p>
        <Link href={`/agents/${user.agent_id}`} className={styles.textLink}>
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
