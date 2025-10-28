'use client';

import Link from 'next/link';
import styles from './page.module.css';

export default function MyHomePage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>My Home</h1>
        <div className={styles.badge}>Under Development</div>
        <p className={styles.description}>
          This page is currently under development. Check back soon for updates!
        </p>
        <Link href="/" className={styles.backLink}>
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
