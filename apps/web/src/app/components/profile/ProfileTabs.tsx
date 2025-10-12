
'use client';

import { useState } from 'react';
import styles from './ProfileTabs.module.css';

const tabs = [
  'Overview',
  'Reviews',
  'Matching Requests',
  'Matching Jobs',
  'Matching Agents',
];

export default function ProfileTabs() {
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div className={styles.profileTabs}>
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`${styles.tab} ${activeTab === tab ? styles.active : ''}`}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
