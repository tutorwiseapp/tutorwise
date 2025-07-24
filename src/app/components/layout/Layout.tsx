/*
 * Filename: src/app/components/layout/Layout.tsx
 * ...
 * Change Summary:
 * The component's styling has been correctly moved to a dedicated CSS module. All redundant
 * and incorrect font definitions have been removed.
 */
'use client';

import React from 'react';
import Header from './Header';
import Footer from './Footer';
import styles from './layout.module.css';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className={styles.appWrapper}>
      <Header />
      <main className={styles.mainContent}>
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;