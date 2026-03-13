/*
 * Filename: src/app/components/ui/PageHeader.tsx
 * Purpose: Reusable shell component for page headers with alignment variants
 *
 * Change History:
 * C003 - 2026-01-12 : Added align prop for center/left alignment variants
 * C002 - 2025-07-22 : 01:30 - Added optional className prop for style variations.
 * C001 - [Date] : [Time] - Initial creation.
 *
 * Last Modified: 2026-01-12
 * Requirement ID: Consistent header styling across signup, login, and onboarding
 *
 * Change Summary:
 * Added `align` prop to support center-aligned headers (default) and left-aligned headers.
 * This allows the component to be used consistently across signup, login, and onboarding pages.
 *
 * Usage:
 * <PageHeader title="Create Account" subtitle="Join us" align="center" />
 * <PageHeader title="Dashboard" subtitle="Welcome back" align="left" />
 *
 * Dependencies: "react", "./PageHeader.module.css".
 * Props: { title: string, subtitle?: string, align?: 'center' | 'left', className?: string }
 */
import React from 'react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
  className?: string;
}

const PageHeader = ({ title, subtitle, align = 'center', className }: PageHeaderProps) => {
  // Combine the base class with alignment variant and any passed-in className
  const headerClasses = [
    styles.pageHeader,
    styles[align], // Apply alignment variant (styles.center or styles.left)
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={headerClasses}>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
};

export default PageHeader;