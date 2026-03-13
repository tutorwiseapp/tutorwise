/*
 * Filename: src/app/components/ui/nav/GuanMenuIcon.tsx
 * Purpose: Renders the unique, animated SVG icon for the main navigation menu.
 *
 * Change History:
 * C002 - 2025-07-20 : 17:30 - Updated SVG path for visual balance.
 * C001 - 2025-07-20 : 17:00 - Initial creation.
 *
 * Last Modified: 2025-07-20 : 17:30
 * Requirement ID (optional): VIN-UI-010
 *
 * Change Summary:
 * The SVG `d` attribute for the '关' character has been modified to make the top horizontal
 * line the same width as the bottom one. This creates a more balanced and aesthetically
 * pleasing icon design.
 *
 * Impact Analysis:
 * This is a minor visual refinement to the icon's geometry.
 *
 * Dependencies: "react", "./GuanMenuIcon.module.css".
 * Props: { isOpen: boolean } - Controls which icon state is visible.
 */
'use client';

import React from 'react';
import styles from './GuanMenuIcon.module.css';

interface GuanMenuIconProps {
  isOpen: boolean;
}

const GuanMenuIcon = ({ isOpen }: GuanMenuIconProps) => {
  return (
    <div className={`${styles.iconContainer} ${isOpen ? styles.open : ''}`}>
      <svg
        className={styles.iconSvg}
        viewBox="0 0 24 24"
        fill="none"
        /* stroke="currentColor" is now controlled by the CSS */
        strokeWidth="2" /* Semi-bold weight */
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* --- THIS IS THE FIX --- */}
        {/* The first 'M' command was changed from 'M10 5' to 'M8 5' to match the bottom line's width */}
        <path className={styles.guanPath} d="M4 12 L20 12 M4 16 L20 16 M8 5 L16 5 M12 5 L12 20 M8 20 L16 20" />
        
        {/* Path for the 'X' (close) character */}
        <path className={styles.closePath} d="M18 6 L6 18 M6 6 L18 18" />
      </svg>
    </div>
  );
};

export default GuanMenuIcon;