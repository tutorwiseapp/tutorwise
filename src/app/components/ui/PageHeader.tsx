import React from 'react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  // The subtitle is an optional string. The component will work with or without it.
  subtitle?: string;
}

const PageHeader = ({ title, subtitle }: PageHeaderProps) => {
  return (
    <div className={styles.pageHeader}>
      <h1 className={styles.title}>{title}</h1>
      {/* This line conditionally renders the subtitle ONLY if it is provided */}
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
};

export default PageHeader;