/**
 * Filename: apps/web/src/app/components/ui/actions/VerticalDotsMenu.tsx
 * Purpose: Shared 3-dot action menu for admin data tables
 * Pattern: Uses createPortal to escape overflow:hidden on HubDataTable cells
 * Used by: UsersTable, ArticlesTable, ListingsTable, BookingsTable, etc.
 */
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import styles from './VerticalDotsMenu.module.css';

export interface MenuAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  color?: string;
  title?: string;
}

interface VerticalDotsMenuProps {
  actions: MenuAction[];
}

export default function VerticalDotsMenu({ actions }: VerticalDotsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    setMenuPosition(null);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        closeMenu();
      }
    };

    // Close on scroll (menu position becomes stale)
    const handleScroll = () => closeMenu();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, closeMenu]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isOpen) {
      closeMenu();
    } else {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        setMenuPosition({
          top: rect.bottom + 4,
          left: rect.right - 160,
        });
        setIsOpen(true);
      }
    }
  };

  return (
    <div className={styles.actionsCell}>
      <button
        ref={buttonRef}
        className={styles.actionsButton}
        onClick={handleToggle}
        aria-label="More actions"
      >
        <MoreVertical size={16} />
      </button>
      {isOpen && menuPosition && createPortal(
        <div
          ref={menuRef}
          className={styles.actionsMenu}
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
          }}
        >
          {actions.map((action) => (
            <button
              key={action.label}
              className={`${styles.actionMenuItem}${action.variant === 'danger' ? ` ${styles.actionMenuItemDanger}` : ''}`}
              disabled={action.disabled}
              title={action.title}
              style={action.color ? { color: action.disabled ? '#9ca3af' : action.color } : action.disabled ? { color: '#9ca3af' } : undefined}
              onClick={(e) => {
                e.stopPropagation();
                if (action.disabled) return;
                closeMenu();
                action.onClick();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
