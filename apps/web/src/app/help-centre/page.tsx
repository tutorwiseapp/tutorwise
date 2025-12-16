'use client';

import styles from './page.module.css';

/**
 * Help Centre page
 * Currently a placeholder - when real content is added, consider using React Query
 * with placeholderData: keepPreviousData for loading optimization
 */
export default function HelpCentrePage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Help centre</h1>
        <p className={styles.message}>Under Development</p>
      </div>
    </div>
  );
}
