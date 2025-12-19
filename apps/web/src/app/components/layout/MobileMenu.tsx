/*
 * Filename: src/app/components/layout/MobileMenu.tsx
 * Purpose: Mobile hamburger menu for mobile/tablet navigation
 * Created: 2025-12-11
 *
 * Features:
 * - Full-screen slide-in menu from right
 * - Shows navigation items not in bottom nav
 * - Role indicator and switching
 * - Account management items
 * - Only visible on mobile/tablet devices
 */
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useUserProfile } from '@/app/contexts/UserProfileContext';
import { createClient } from '@/utils/supabase/client';
import type { Role } from '@/types';
import getProfileImageUrl from '@/lib/utils/image';
import styles from './MobileMenu.module.css';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RoleConfig {
  label: string;
  icon: string;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, activeRole, availableRoles, switchRole, isRoleSwitching } = useUserProfile();

  const roleConfig: Record<Role, RoleConfig> = {
    agent: { label: 'Agent', icon: '🏠' },
    tutor: { label: 'Tutor', icon: '🎓' },
    client: { label: 'Client', icon: '📚' },
    student: { label: 'Student', icon: '🎒' }
  } as const;

  const handleRoleSwitch = async (role: Role) => {
    try {
      await switchRole(role);
      onClose();
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Failed to switch role:', error);
    }
  };

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

  if (!isOpen) return null;

  const isAuthenticated = !!profile;

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* Menu Panel */}
      <div className={styles.menuPanel}>
        {/* Header with close button */}
        <div className={styles.menuHeader}>
          {isAuthenticated && (
            <div className={styles.userInfo}>
              <Image
                src={getProfileImageUrl(profile)}
                alt="User Avatar"
                width={40}
                height={40}
                className={styles.avatar}
              />
              <div className={styles.userName}>
                {profile.first_name && profile.last_name
                  ? `${profile.first_name} ${profile.last_name}`
                  : profile.email}
              </div>
            </div>
          )}
          <button className={styles.closeButton} onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        </div>

        {/* Menu Content */}
        <div className={styles.menuContent}>
          {isAuthenticated ? (
            <>
              {/* Role Indicator */}
              {activeRole && roleConfig[activeRole] && profile?.onboarding_progress?.onboarding_completed && (
                <div className={styles.roleLabel}>
                  {roleConfig[activeRole].icon} {roleConfig[activeRole].label}
                </div>
              )}
              <div className={styles.separator} />

              {/* Navigation Items (excluding items in bottom nav) */}
              <Link href="/listings" className={styles.menuItem} onClick={handleLinkClick}>
                Listings
              </Link>

              {/* Financials with sub-items */}
              <div className={styles.menuItem}>Financials</div>
              <Link href="/financials" className={styles.subMenuItem} onClick={handleLinkClick}>
                Transactions
              </Link>
              <Link href="/financials/payouts" className={styles.subMenuItem} onClick={handleLinkClick}>
                Payouts
              </Link>
              <Link href="/financials/disputes" className={styles.subMenuItem} onClick={handleLinkClick}>
                Disputes
              </Link>

              <Link href="/messages" className={styles.menuItem} onClick={handleLinkClick}>
                Messages
              </Link>
              <Link href="/network" className={styles.menuItem} onClick={handleLinkClick}>
                Network
              </Link>
              <Link href="/reviews" className={styles.menuItem} onClick={handleLinkClick}>
                Reviews
              </Link>
              <Link href="/wiselists" className={styles.menuItem} onClick={handleLinkClick}>
                Wiselists
              </Link>

              {/* Role-specific items */}
              {activeRole === 'agent' && (
                <Link href="/organisation" className={styles.menuItem} onClick={handleLinkClick}>
                  Organisation
                </Link>
              )}
              {(activeRole === 'client' || activeRole === 'tutor') && (
                <Link href="/my-students" className={styles.menuItem} onClick={handleLinkClick}>
                  My Students
                </Link>
              )}

              <div className={styles.separator12px} />

              {/* Role Switching Section */}
              {availableRoles && availableRoles.length > 1 && (
                <>
                  <div className={styles.switchLabel}>Switch Role:</div>
                  {availableRoles.map((role) => {
                    if (role === activeRole) return null;
                    const config = roleConfig[role];
                    return (
                      <button
                        key={role}
                        className={styles.roleItem}
                        onClick={() => handleRoleSwitch(role)}
                        disabled={isRoleSwitching}
                      >
                        {config.icon} {config.label}
                      </button>
                    );
                  })}
                </>
              )}

              {/* Role Onboarding Section */}
              {!availableRoles?.includes('tutor') && (
                <Link href="/onboarding" className={styles.becomeItem} onClick={handleLinkClick}>
                  <div className={styles.becomeTitle}>Become a tutor</div>
                  <div className={styles.becomeSubtitle}>Start teaching and earn income</div>
                </Link>
              )}
              {!availableRoles?.includes('client') && (
                <Link href="/onboarding" className={styles.becomeItem} onClick={handleLinkClick}>
                  <div className={styles.becomeTitle}>Become a client</div>
                  <div className={styles.becomeSubtitle}>Find tutors and start learning</div>
                </Link>
              )}
              {!availableRoles?.includes('agent') && (
                <Link href="/onboarding" className={styles.becomeItem} onClick={handleLinkClick}>
                  <div className={styles.becomeTitle}>Become an agent</div>
                  <div className={styles.becomeSubtitle}>Grow your business on our platform</div>
                </Link>
              )}

              <div className={styles.separator12px} />

              {/* Account Section */}
              <Link href="/account" className={styles.menuItem} onClick={handleLinkClick}>
                Account
              </Link>
              <Link href="/payments" className={styles.menuItem} onClick={handleLinkClick}>
                Payments
              </Link>
              <Link href="/help-centre" className={styles.menuItem} onClick={handleLinkClick}>
                Help Centre
              </Link>

              <div className={styles.separator} />

              <button className={`${styles.menuItem} ${styles.logoutItem}`} onClick={handleSignOut}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/signup" className={styles.menuItem} onClick={handleLinkClick}>
                Sign Up
              </Link>
              <Link href="/login" className={styles.menuItem} onClick={handleLinkClick}>
                Log In
              </Link>
              <div className={styles.separator} />
              <Link href="/your-home" className={styles.menuItem} onClick={handleLinkClick}>
                About Tutorwise
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
