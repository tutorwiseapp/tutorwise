/*
 * Filename: src/app/components/ui/PageHeader.tsx
 * Purpose: Renders a standardized page header with an optional subtitle and className.
 *
 * Change History:
 * C002 - 2025-07-22 : 01:30 - Added optional className prop for style variations.
 * C001 - [Date] : [Time] - Initial creation.
 *
 * Last Modified: 2025-07-22 : 01:30
 * Requirement ID (optional): VIN-UI-015
 *
 * Change Summary:
 * The component now accepts an optional `className` prop. This allows parent components
 * to pass in modifier classes (like `.compact`), making the component more flexible
 * and adaptable to different layout contexts.
 *
 * Impact Analysis:
 * This is an additive, non-breaking change that enhances the component's reusability.
 *
 * Dependencies: "react", "./PageHeader.module.css".
 * Props: { title: string, subtitle?: string, className?: string }
 */
import React from 'react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

const PageHeader = ({ title, subtitle, className }: PageHeaderProps) => {
  // Combine the base class with any passed-in className
  const headerClasses = [
    styles.pageHeader,
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