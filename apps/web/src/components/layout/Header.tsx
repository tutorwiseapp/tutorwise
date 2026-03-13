/*
 * Filename: src/app/components/layout/Header.tsx
 * Purpose: Provides the main site navigation header with logo and primary nav menu.
 * Change History:
 * C009 - 2025-12-21 : Removed logo toggle behavior - logo always points to home (/).
 * C008 - 2025-12-20 : Updated logo toggle to point to /about-tutorwise (renamed from /your-home).
 * C007 - 2025-12-09 : Updated logo toggle to point to /your-home (renamed from /my-home).
 * C006 - 2025-10-28 : Updated logo toggle to point to /my-home instead of /refer page.
 * C005 - 2025-07-28 : 13:00 - Definitive fix for the 'children' prop type error.
 * C004 - 2025-07-28 : 10:00 - Restored contextual logo link and NavMenu usage.
 * ... (previous history)
 * Last Modified: 2025-12-21
 * Change Summary: Removed contextual logo toggle behavior. Logo now always navigates to home (/).
 * Dependencies: "next/link", "./NavMenu".
 */
'use client';

import Link from 'next/link';
import NavMenu from './NavMenu';
import Logo from '../ui/branding/Logo';
import styles from './Header.module.css';

const Header = () => {
  const logoHref = '/';

  return (
    <header className={styles.header}>
      <div className={styles.headerLogo}>
        <Link href={logoHref} aria-label="Tutorwise Home">
          <Logo width={140} height={24} />
        </Link>
      </div>

      <div className={styles.headerActions}>
        <NavMenu />
      </div>

    </header>
  );
};

export default Header;