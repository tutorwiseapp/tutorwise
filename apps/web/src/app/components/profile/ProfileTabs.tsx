
'use client';

import styles from './ProfileTabs.module.css';

const tabs = [
  'Personal Info',
  'Professional Info',
  'Reviews',
  'Matching Requests',
  'Matching Jobs',
  'Matching Agents',
];

interface ProfileTabsProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function ProfileTabs({ activeTab = 'Personal Info', onTabChange }: ProfileTabsProps) {
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
