/*
 * Filename: src/app/components/admin/layout/AdminMobileMenu.tsx
 * Purpose: Mobile hamburger menu for admin navigation
 * Created: 2026-01-30
 *
 * Features:
 * - Full-screen slide-in menu from right
 * - Shows admin navigation items
 * - Exit to user dashboard link
 * - Only visible on mobile/tablet devices
 */
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { useAdminProfile } from '@/lib/rbac';
import { createClient } from '@/utils/supabase/client';
import getProfileImageUrl from '@/lib/utils/image';
import styles from './AdminMobileMenu.module.css';

interface AdminMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminMobileMenu({ isOpen, onClose }: AdminMobileMenuProps) {
  const pathname = usePathname();
  const { profile } = useUserProfile();
  const { profile: adminProfile } = useAdminProfile();

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  const handleLinkClick = () => {
    onClose();
  };

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname?.startsWith(href);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* Menu Panel */}
      <div className={styles.menuPanel}>
        {/* Header with close button */}
        <div className={styles.menuHeader}>
          {profile && (
            <div className={styles.userInfo}>
              <Image
                src={getProfileImageUrl(profile)}
                alt="Admin Avatar"
                width={40}
                height={40}
                className={styles.avatar}
              />
              <div className={styles.userDetails}>
                <div className={styles.userName}>
                  {profile.first_name && profile.last_name
                    ? `${profile.first_name} ${profile.last_name}`
                    : profile.email}
                </div>
                <div className={styles.adminBadge}>
                  ⚙️ {adminProfile?.admin_role || 'Admin'}
                </div>
              </div>
            </div>
          )}
          <button className={styles.closeButton} onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        </div>

        {/* Menu Content */}
        <div className={styles.menuContent}>
          {/* Main Admin Navigation */}
          <Link
            href="/admin"
            className={`${styles.menuItem} ${isActive('/admin') && pathname === '/admin' ? styles.menuItemActive : ''}`}
            onClick={handleLinkClick}
          >
            Dashboard
          </Link>

          {/* Signal */}
          <Link
            href="/admin/signal"
            className={`${styles.menuItem} ${isActive('/admin/signal') ? styles.menuItemActive : ''}`}
            onClick={handleLinkClick}
          >
            Signal
          </Link>

          {/* Resources with sub-items */}
          <div className={styles.menuSection}>Resources</div>
          <Link href="/admin/resources" className={styles.subMenuItem} onClick={handleLinkClick}>
            All Articles
          </Link>
          <Link href="/admin/resources/new" className={styles.subMenuItem} onClick={handleLinkClick}>
            New Article
          </Link>
          <Link href="/admin/resources/seo" className={styles.subMenuItem} onClick={handleLinkClick}>
            SEO Performance
          </Link>

          {/* SEO with sub-items */}
          <div className={styles.menuSection}>SEO</div>
          <Link href="/admin/seo" className={styles.subMenuItem} onClick={handleLinkClick}>
            Overview
          </Link>
          <Link href="/admin/seo/hubs" className={styles.subMenuItem} onClick={handleLinkClick}>
            Hubs
          </Link>
          <Link href="/admin/seo/spokes" className={styles.subMenuItem} onClick={handleLinkClick}>
            Spokes
          </Link>
          <Link href="/admin/seo/keywords" className={styles.subMenuItem} onClick={handleLinkClick}>
            Keywords
          </Link>

          <div className={styles.separator} />

          {/* Core Admin Pages */}
          <Link
            href="/admin/listings"
            className={`${styles.menuItem} ${isActive('/admin/listings') ? styles.menuItemActive : ''}`}
            onClick={handleLinkClick}
          >
            Listings
          </Link>
          <Link
            href="/admin/bookings"
            className={`${styles.menuItem} ${isActive('/admin/bookings') ? styles.menuItemActive : ''}`}
            onClick={handleLinkClick}
          >
            Bookings
          </Link>
          <Link
            href="/admin/referrals"
            className={`${styles.menuItem} ${isActive('/admin/referrals') ? styles.menuItemActive : ''}`}
            onClick={handleLinkClick}
          >
            Referrals
          </Link>

          {/* Accounts with sub-items */}
          <div className={styles.menuSection}>Accounts</div>
          <Link href="/admin/accounts/users" className={styles.subMenuItem} onClick={handleLinkClick}>
            Users
          </Link>
          <Link href="/admin/accounts/admins" className={styles.subMenuItem} onClick={handleLinkClick}>
            Admins
          </Link>

          <Link
            href="/admin/organisations"
            className={`${styles.menuItem} ${isActive('/admin/organisations') ? styles.menuItemActive : ''}`}
            onClick={handleLinkClick}
          >
            Organisations
          </Link>

          {/* Financials with sub-items */}
          <div className={styles.menuSection}>Financials</div>
          <Link href="/admin/financials" className={styles.subMenuItem} onClick={handleLinkClick}>
            Transactions
          </Link>
          <Link href="/admin/financials/payouts" className={styles.subMenuItem} onClick={handleLinkClick}>
            Payouts
          </Link>
          <Link href="/admin/financials/disputes" className={styles.subMenuItem} onClick={handleLinkClick}>
            Disputes
          </Link>

          <div className={styles.separator} />

          <Link
            href="/admin/reviews"
            className={`${styles.menuItem} ${isActive('/admin/reviews') ? styles.menuItemActive : ''}`}
            onClick={handleLinkClick}
          >
            Reviews
          </Link>
          <Link
            href="/admin/configurations"
            className={`${styles.menuItem} ${isActive('/admin/configurations') ? styles.menuItemActive : ''}`}
            onClick={handleLinkClick}
          >
            Configurations
          </Link>
          <Link
            href="/admin/settings"
            className={`${styles.menuItem} ${isActive('/admin/settings') ? styles.menuItemActive : ''}`}
            onClick={handleLinkClick}
          >
            Settings
          </Link>

          <div className={styles.separator} />

          {/* Return to User Dashboard */}
          <Link href="/dashboard" className={styles.exitItem} onClick={handleLinkClick}>
            Dashboard
          </Link>

          <div className={styles.separator} />

          <button className={`${styles.menuItem} ${styles.logoutItem}`} onClick={handleSignOut}>
            Log out
          </button>
        </div>
      </div>
    </>
  );
}
