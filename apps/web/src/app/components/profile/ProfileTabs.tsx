
'use client';

import styles from './ProfileTabs.module.css';

// Role-specific tab configurations
const getRoleTabs = (activeRole: string | null) => {
  const baseTabs = ['Personal Info', 'Professional Info', 'Reviews'];

  switch (activeRole) {
    case 'seeker': // Client
      return [...baseTabs, 'Matching Requests'];
    case 'provider': // Tutor
      return [...baseTabs, 'Matching Jobs'];
    case 'agent':
      return [...baseTabs, 'Matching Requests', 'Matching Jobs', 'Matching Agents'];
    default:
      return baseTabs;
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
