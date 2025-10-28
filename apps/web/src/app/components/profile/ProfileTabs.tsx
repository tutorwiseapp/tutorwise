
'use client';

import styles from './ProfileTabs.module.css';

// Role-specific tab configurations
const getRoleTabs = (activeRole: string | null) => {
  switch (activeRole) {
    case 'client':
      return ['Overview', 'Reviews', 'Matching Tutors', 'Matching Agents', 'Matching Listings'];
    case 'tutor':
      return ['Overview', 'Reviews', 'Matching Clients', 'Matching Agents', 'Matching Listings'];
    case 'agent':
      return ['Overview', 'Reviews', 'Matching Clients', 'Matching Tutors', 'Matching Listings'];
    default:
      return ['Overview', 'Reviews'];
  }
};

interface ProfileTabsProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  activeRole?: string | null;
}

export default function ProfileTabs({ activeTab = 'Overview', onTabChange, activeRole }: ProfileTabsProps) {
  const tabs = getRoleTabs(activeRole ?? null);

  return (
    <div className={styles.profileTabs}>
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`${styles.tab} ${activeTab === tab ? styles.active : ''}`}
          onClick={() => onTabChange?.(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
