/**
 * Filename: SidebarComplexWidget.tsx
 * Purpose: Core Complex Widget Shell - Zero-padding wrapper for custom content
 * Created: 2025-11-18
 * Design: context-sidebar-ui-design-v2.md Section 2.3
 *
 * Pattern C: Complex Widget Pattern
 * - Wrapper with standard shadow/radius/border
 * - ZERO internal padding (children control their own spacing)
 * - Allows edge-to-edge content (tabs, images, etc.)
 * - Children typically add 'p-4' for "contained" aesthetic
 */

'use client';

import React from 'react';
import styles from './SidebarComplexWidget.module.css';

interface SidebarComplexWidgetProps {
  children: React.ReactNode;
  className?: string;
}

export default function SidebarComplexWidget({
  children,
  className = '',
}: SidebarComplexWidgetProps) {
  return (
    <div className={`${styles.complexWidget} ${className}`}>
      {children}
    </div>
  );
}
