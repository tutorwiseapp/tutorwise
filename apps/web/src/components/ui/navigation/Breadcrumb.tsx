import React from 'react';
import Link from 'next/link';
import styles from './Breadcrumb.module.css';

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  crumbs: Crumb[];
}

const Breadcrumb = ({ crumbs }: BreadcrumbProps) => {
  if (!crumbs || crumbs.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumbNav}>
      <ol className={styles.breadcrumbList}>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          
          return (
            <li key={crumb.label + index} className={styles.breadcrumbItem}>
              {!isLast && crumb.href ? (
                <Link href={crumb.href} className={styles.breadcrumbLink}>
                  {crumb.label}
                </Link>
              ) : (
                <span className={styles.breadcrumbCurrent} aria-current={isLast ? "page" : undefined}>
                  {crumb.label}
                </span>
              )}
              {!isLast && (
                <span className={styles.separator} aria-hidden="true">/</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;