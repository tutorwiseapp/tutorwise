/**
 * Filename: apps/web/src/app/components/help-centre/widgets/PopularArticlesWidget.tsx
 * Purpose: Popular Articles widget for help centre right sidebar
 * Created: 2025-01-19
 */

'use client';

import styles from './widgets.module.css';

export default function PopularArticlesWidget() {
  return (
    <div className={styles.widget}>
      <h3 className={styles.widgetTitle}>🔥 Most Helpful</h3>
      <div className={styles.popularArticlesEmpty}>No popular articles yet.</div>
    </div>
  );
}
