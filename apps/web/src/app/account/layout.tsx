'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Container from '@/app/components/layout/Container';
import styles from './account.module.css';

const accountTabs = [
  { href: '/account/personal-info', label: 'Personal Info' },
  { href: '/account/professional-info', label: 'Professional Info' },
  { href: '/account/settings', label: 'Settings' },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <Container>
      <div className={styles.accountContainer}>
        <h1 className={styles.title}>Account Settings</h1>

        {/* Top Navigation Tabs */}
        <nav className={styles.tabs}>
          {accountTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`${styles.tab} ${
                pathname === tab.href ? styles.tabActive : ''
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {/* Tab Content */}
        <div className={styles.content}>{children}</div>
      </div>
    </Container>
  );
}
