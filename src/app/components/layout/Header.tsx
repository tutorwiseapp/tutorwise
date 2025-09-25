/*
 * Filename: src/app/components/layout/Header.tsx
 * Purpose: Provides the main site navigation header, including context-aware logo link and the primary nav menu.
 * Change History:
 * C005 - 2025-07-28 : 13:00 - Definitive fix for the 'children' prop type error.
 * C004 - 2025-07-28 : 10:00 - Restored contextual logo link and NavMenu usage.
 * ... (previous history)
 * Last Modified: 2025-07-28 : 13:00
 * Requirement ID (optional): VIN-UI-009
 * Change Summary: This is the definitive fix for the build failure. The `<NavMenu>` component
 * was being invoked with a `children` prop, which it does not accept. It has been corrected
 * to be a self-closing tag (`<NavMenu />`), which resolves the TypeScript type error.
 * Impact Analysis: This change fixes a critical build-blocking error and restores the header
 * to a functional state.
 * Dependencies: "next/link", "next/navigation", "./NavMenu".
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NavMenu from './NavMenu';
import styles from './Header.module.css';

const Header = () => {
  const pathname = usePathname();

  const logoHref = pathname === '/' ? '/refer' : '/';

  return (
    <header className={styles.header}>
      <div className={styles.headerLogo}>
        <Link href={logoHref}>tutorwise</Link>
      </div>
      
      {/* --- THIS IS THE SURGICAL FIX --- */}
      {/* The component must be self-closing because it does not accept children. */}
      <NavMenu />
      
    </header>
  );
};

export default Header;