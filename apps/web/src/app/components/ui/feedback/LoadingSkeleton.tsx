/**
 * Filename: LoadingSkeleton.tsx
 * Purpose: Reusable loading skeleton components for dashboard widgets
 * Created: 2025-12-07
 */

import styles from './LoadingSkeleton.module.css';

interface SkeletonProps {
  className?: string;
}

export const SkeletonLine = ({ className = '' }: SkeletonProps) => (
  <div className={`${styles.skeleton} ${styles.line} ${className}`} />
);

export const SkeletonCircle = ({ className = '' }: SkeletonProps) => (
  <div className={`${styles.skeleton} ${styles.circle} ${className}`} />
);

export const SkeletonRect = ({ className = '' }: SkeletonProps) => (
  <div className={`${styles.skeleton} ${styles.rect} ${className}`} />
);

interface ChartSkeletonProps {
  height?: string;
}

export const ChartSkeleton = ({ height = '300px' }: ChartSkeletonProps) => (
  <div className={styles.chartContainer} style={{ height }}>
    <div className={styles.chartHeader}>
      <SkeletonLine className={styles.chartTitle} />
      <SkeletonLine className={styles.chartSubtitle} />
    </div>
    <div className={styles.chartBody}>
      <SkeletonRect className={styles.chartPlaceholder} />
    </div>
  </div>
);

interface WidgetSkeletonProps {
  showIcon?: boolean;
}

export const WidgetSkeleton = ({ showIcon = true }: WidgetSkeletonProps) => (
  <div className={styles.widgetContainer}>
    <div className={styles.widgetHeader}>
      {showIcon && <SkeletonCircle className={styles.widgetIcon} />}
      <div className={styles.widgetHeaderText}>
        <SkeletonLine className={styles.widgetTitle} />
        <SkeletonLine className={styles.widgetSubtitle} />
      </div>
    </div>
    <div className={styles.widgetBody}>
      <SkeletonLine className={styles.widgetLine} />
      <SkeletonLine className={styles.widgetLine} />
      <SkeletonLine className={styles.widgetLine} />
    </div>
  </div>
);

interface KPISkeletonProps {
  count?: number;
}

export const KPISkeleton = ({ count = 4 }: KPISkeletonProps) => (
  <div className={styles.kpiGrid}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className={styles.kpiCard}>
        <SkeletonLine className={styles.kpiLabel} />
        <SkeletonLine className={styles.kpiValue} />
      </div>
    ))}
  </div>
);
