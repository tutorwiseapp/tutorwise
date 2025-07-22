/*
 * Filename: src/app/components/ui/profile/ProfileSidebar.tsx
 * Purpose: A reusable sidebar component to display a user's key profile information.
 *
 * Change History:
 * C002 - 2025-07-21 : 19:45 - Refactored JSX to group name/ID for consistent vertical spacing.
 * C001 - 2024-07-17 : 13:40 - Refactored to use Profile interface and fix public profile link.
 *
 * Last Modified: 2025-07-21 : 19:45
 * Requirement ID: VIN-UI-013
 *
 * Change Summary:
 * The `DisplayName` and `AgentId` are now wrapped in a single `div` with the class `nameBlock`.
 * This treats them as a single semantic unit and allows for consistent, computed `margin-bottom`
 * to be applied via the stylesheet, fixing the component's vertical rhythm.
 *
 * Impact Analysis:
 * This change resolves a subtle but important visual layout bug, creating a more polished component.
 *
 * Dependencies: src/types/index.ts, next/image, next/link, "./ProfileSidebar.module.css".
 * Props: user: The Profile object to display.
 */

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Profile } from '@/types';
import Card from '@/app/components/ui/Card';
import styles from './ProfileSidebar.module.css';
import getProfileImageUrl from '@/lib/utils/image';

interface ProfileSidebarProps {
  user: Partial<Profile>;
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
        
        <div className={styles.nameBlock}>
          <h2 className={styles.displayName}>{user.display_name || 'Agent'}</h2>
          <p className={styles.agentId}>{user.agent_id}</p>
        </div>
        
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