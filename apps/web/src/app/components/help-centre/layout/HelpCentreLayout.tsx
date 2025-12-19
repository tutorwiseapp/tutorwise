/**
 * Filename: apps/web/src/app/components/help-centre/layout/HelpCentreLayout.tsx
 * Purpose: Main 3-column layout for help centre (320px + fluid + 320px)
 * Created: 2025-01-19
 */

'use client';

import { ReactNode, useState } from 'react';
import styles from './HelpCentreLayout.module.css';

interface HelpCentreLayoutProps {
  leftSidebar: ReactNode;
  rightSidebar: ReactNode;
  children: ReactNode;
}

export default function HelpCentreLayout({
  leftSidebar,
  rightSidebar,
  children,
}: HelpCentreLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <div className={styles.layout}>
        {/* Left Sidebar - 320px (Category Navigation) */}
        <aside className={`${styles.leftSidebar} ${isMobileMenuOpen ? styles.open : ''}`}>
          {leftSidebar}
        </aside>

        {/* Main Content - Fluid */}
        <main className={styles.mainContent}>{children}</main>

        {/* Right Sidebar - 320px (Widgets) */}
        <aside className={styles.rightSidebar}>{rightSidebar}</aside>
      </div>

      {/* Mobile Menu Button (visible on mobile only) */}
      <button
        className={styles.mobileMenuButton}
        onClick={toggleMobileMenu}
        aria-label="Toggle navigation menu"
      >
        <span>☰</span>
        <span>Menu</span>
      </button>

      {/* Mobile Backdrop (close menu when clicked) */}
      {isMobileMenuOpen && (
        <div
          className={`${styles.backdrop} ${isMobileMenuOpen ? styles.visible : ''}`}
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}
    </>
  );
}
