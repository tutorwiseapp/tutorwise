/*
 * Filename: src/app/components/ui/profile/ProfileSidebar.tsx
 * Purpose: A reusable sidebar component to display a user's key profile information.
 * Change History:
 * C009 - 2025-08-10 : 11:00 - Removed redundant "Edit Profile" link.
 * C008 - 2025-07-27 : 11:00 - Restored usage of the getProfileImageUrl utility.
 * C007 - 2025-07-27 : 11:00 - (Previous history)
 * Last Modified: 2025-08-010 : 11:00
 * Requirement ID: VIN-UI-013
 * Change Summary: The component has been simplified. The `isOwnProfile` prop and the conditional logic for the "Edit Public Profile" link have been removed. This component is now solely responsible for displaying the user's private profile sidebar, which should only ever contain the link to "View Public Profile". This aligns with the "Single Responsibility" principle.
 * Impact Analysis: This change removes the confusing, redundant "Edit Public Profile" link from the user's private profile page, improving the user experience and clarifying the component's purpose.
 * Dependencies: "@/types", "next/image", "next/link", "./ProfileSidebar.module.css", "@/lib/utils/image".
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
          <p className={styles.agentId}>ID: {user.referral_id || user.id?.slice(0, 8)}</p>
        </div>

        <div className={styles.linkGroup}>
          {/* --- THIS IS THE FIX --- */}
          {/* Only show the link to the public profile page. */}
          {user.id && (
            <Link href={`/agents/${user.id}`} className={styles.textLink}>
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