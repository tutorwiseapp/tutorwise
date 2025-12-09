/*
 * Filename: src/app/components/layout/Header.tsx
 * Purpose: Provides the main site navigation header, including context-aware logo link and the primary nav menu.
 * Change History:
 * C007 - 2025-12-09 : Updated logo toggle to point to /your-home (renamed from /my-home).
 * C006 - 2025-10-28 : Updated logo toggle to point to /my-home instead of /refer page.
 * C005 - 2025-07-28 : 13:00 - Definitive fix for the 'children' prop type error.
 * C004 - 2025-07-28 : 10:00 - Restored contextual logo link and NavMenu usage.
 * ... (previous history)
 * Last Modified: 2025-12-09
 * Change Summary: Updated the contextual logo link behavior. When on homepage (/), clicking
 * the logo now navigates to /your-home instead of /refer page.
 * Dependencies: "next/link", "next/navigation", "./NavMenu".
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NavMenu from './NavMenu';
import styles from './Header.module.css';

const Header = () => {
  const pathname = usePathname();

  const logoHref = pathname === '/' ? '/your-home' : '/';

  return (
    <header className={styles.header}>
      <div className={styles.headerLogo}>
        <Link href={logoHref}>tutorwise</Link>
      </div>

      <div className={styles.headerActions}>
        <NavMenu />
      </div>

    </header>
  );
};

export default Header;