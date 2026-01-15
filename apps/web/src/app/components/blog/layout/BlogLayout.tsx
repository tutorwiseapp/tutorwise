/**
 * Filename: apps/web/src/app/components/blog/layout/BlogLayout.tsx
 * Purpose: Main 3-column layout for blog (320px + fluid + 320px)
 * Created: 2026-01-15
 */

'use client';

import { ReactNode, useState } from 'react';
import styles from './BlogLayout.module.css';

interface BlogLayoutProps {
  leftSidebar: ReactNode | ((onClose?: () => void) => ReactNode);
  rightSidebar: ReactNode;
  children: ReactNode;
}

export default function BlogLayout({
  leftSidebar,
  rightSidebar,
  children,
}: BlogLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Floating button for right sidebar (mobile only) - matches Hub pattern */}
      {rightSidebar && (
        <button
          className={styles.floatingButton}
          onClick={() => setIsRightSidebarOpen(true)}
          aria-label="View blog widgets and info"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 16v-4M12 8h.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}

      {/* Backdrop for right sidebar (mobile) */}
      {rightSidebar && isRightSidebarOpen && (
        <div
          className={styles.rightSidebarBackdrop}
          onClick={() => setIsRightSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={styles.layout}>
        {/* Left Sidebar - 320px (Category Navigation) */}
        <aside className={`${styles.leftSidebar} ${isMobileMenuOpen ? styles.open : ''}`}>
          {typeof leftSidebar === 'function' ? leftSidebar(closeMobileMenu) : leftSidebar}
        </aside>

        {/* Main Content - Fluid */}
        <main className={styles.mainContent}>{children}</main>

        {/* Right Sidebar - 320px (Widgets) */}
        <aside
          className={`${styles.rightSidebar} ${isRightSidebarOpen ? styles.rightSidebarOpen : ''}`}
        >
          {/* Close button for mobile */}
          <button
            className={styles.closeButton}
            onClick={() => setIsRightSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 5L5 15M5 5l10 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {rightSidebar}
        </aside>
      </div>

      {/* Mobile Menu Button (visible on mobile only) - for left sidebar */}
      <button
        className={styles.mobileMenuButton}
        onClick={toggleMobileMenu}
        aria-label="Toggle navigation menu"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 12h18M3 6h18M3 18h18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Mobile Backdrop for left sidebar (close menu when clicked) */}
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
