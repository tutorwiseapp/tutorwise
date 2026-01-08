/**
 * Filename: Tooltip.tsx
 * Purpose: Reusable accessible tooltip component using Radix UI
 * Created: 2026-01-08
 *
 * Features:
 * - Keyboard navigation support
 * - Screen reader friendly with ARIA attributes
 * - Customizable positioning (top, bottom, left, right)
 * - Configurable delay duration
 * - Arrow indicator
 */

'use client';

import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import styles from './Tooltip.module.css';

// TooltipProvider should wrap the app or section where tooltips are used
export function TooltipProvider({
  children,
  delayDuration = 200
}: {
  children: React.ReactNode;
  delayDuration?: number;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  sideOffset?: number;
  disabled?: boolean;
}

export function Tooltip({
  children,
  content,
  side = 'top',
  align = 'center',
  delayDuration = 200,
  sideOffset = 4,
  disabled = false,
}: TooltipProps) {
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={styles.content}
        >
          {content}
          <TooltipPrimitive.Arrow className={styles.arrow} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

// Convenience wrapper for simple text tooltips
export function InfoTooltip({
  children,
  text,
  ...props
}: Omit<TooltipProps, 'content'> & { text: string }) {
  return (
    <Tooltip content={<span className={styles.text}>{text}</span>} {...props}>
      {children}
    </Tooltip>
  );
}
