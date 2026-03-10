'use client';

import { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './CanvasContextMenu.module.css';

export interface ContextMenuItem {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'navigate';
  dividerBefore?: boolean;
}

interface CanvasContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function CanvasContextMenu({ x, y, items, onClose }: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  // Nudge menu into viewport if it would overflow
  const style: React.CSSProperties = { position: 'fixed', top: y, left: x };
  if (x + 180 > window.innerWidth) style.left = x - 180;
  if (y + items.length * 36 > window.innerHeight) style.top = y - items.length * 36;

  return (
    <div ref={menuRef} className={styles.menu} style={style} role="menu">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <div key={i}>
            {item.dividerBefore && <div className={styles.divider} />}
            <button
              className={`${styles.item} ${item.variant === 'danger' ? styles.danger : ''} ${item.variant === 'navigate' ? styles.navigate : ''}`}
              onClick={() => { item.onClick(); onClose(); }}
              role="menuitem"
            >
              <Icon size={13} />
              {item.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
