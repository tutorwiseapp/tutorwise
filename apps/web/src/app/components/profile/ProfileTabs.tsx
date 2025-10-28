
'use client';

import styles from './ProfileTabs.module.css';

// Role-specific tab configurations
const getRoleTabs = (activeRole: string | null) => {
  switch (activeRole) {
    case 'client':
      return ['Personal Info', 'Professional Info', 'Reviews', 'Matching Tutors', 'Matching Agents', 'Matching Listings'];
    case 'tutor':
      return ['Personal Info', 'Professional Info', 'Reviews', 'Matching Clients', 'Matching Agents', 'Matching Listings'];
    case 'agent':
      return ['Personal Info', 'Professional Info', 'Reviews', 'Matching Clients', 'Matching Tutors', 'Matching Listings'];
    default:
      return ['Personal Info', 'Professional Info', 'Reviews'];
  }
};

interface ProfileTabsProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  activeRole?: string | null;
}

export default function ProfileTabs({ activeTab = 'Personal Info', onTabChange, activeRole }: ProfileTabsProps) {
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
