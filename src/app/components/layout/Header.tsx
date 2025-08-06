/*
 * Filename: src/app/components/layout/Header.tsx
 * Purpose: Provides the main site navigation header, including context-aware logo link and the primary nav menu.
 *
 * Change History:
 * C003 - 2025-07-20 : 17:00 - Replaced inline navigation with the new NavMenu component.
 * C002 - 2025-07-20 : 14:15 - Implemented toggle logic for the main logo link.
 * C001 - [Date] : [Time] - Refactored to handle auth loading state.
 *
 * Last Modified: 2025-07-20 : 17:00
 * Requirement ID (optional): VIN-UI-009
 *
 * Change Summary:
 * The previous <nav> element and all its conditional logic have been completely removed and replaced
 * with a single instance of the new <NavMenu /> component. This significantly cleans up the header,
 * encapsulates all navigation logic within the menu itself, and implements the new design.
 *
 * Impact Analysis:
 * This is a major UI refactor that improves maintainability and user experience by centralizing
 * navigation logic into a dedicated, state-aware component.
 *
 * Dependencies: "next/link", "next/navigation", "./NavMenu".
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NavMenu from './NavMenu'; // Import the new menu component
import styles from './Header.module.css';

const Header = () => {
  const pathname = usePathname();

  // If we are on the homepage ('/'), the logo links to the marketing page ('/refer').
  // Otherwise, it links back to the homepage.
  const logoHref = pathname === '/' ? '/refer' : '/';

  return (
    <header className={styles.header}>
      <div className={styles.headerLogo}>
        <Link href={logoHref}>vinite</Link>
      </div>
      
      {/* The entire previous navigation is replaced by our clean, self-contained component */}
      <NavMenu children={undefined}>
        {/* NavMenu expects children, even if it's just an empty fragment for now */}
      </NavMenu>
    </header>
  );
};

export default Header;