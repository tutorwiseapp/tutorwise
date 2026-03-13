/**
 * Filename: HubComplexModal.tsx
 * Purpose: Generic modal shell for complex/custom content (forms, tabs, etc)
 * Created: 2025-12-25
 * Pattern: Zero-padding body (like HubComplexCard), children control layout
 *
 * Features:
 * - Portal rendering (prevents z-index issues)
 * - Size variants: sm (400px), md (600px), lg (800px), xl (1000px)
 * - Keyboard shortcuts (Escape to close, Tab trapping)
 * - Body scroll lock when open
 * - Smooth animations (fade-in overlay, slide-up modal)
 * - Loading state overlay
 * - onBeforeClose callback (prevent close on unsaved changes)
 * - Light green header background (#E6F0F0) - matches hub sidebar cards
 * - Zero-padding content area - children control their own spacing
 *
 * Usage:
 * <HubComplexModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   title="Connect with Others"
 *   size="md"
 *   footer={
 *     <div className={styles.footer}>
 *       <Button variant="secondary">Cancel</Button>
 *       <Button variant="primary">Submit</Button>
 *     </div>
 *   }
 * >
 *   <YourCustomContent />
 * </HubComplexModal>
 *
 * IMPORTANT: The footer prop content is automatically wrapped in a styled div that provides:
 * - Padding: 24px 32px
 * - Border-top: 1px solid #e5e7eb
 * - Background: white
 * Your footer content should ONLY handle button layout (flex, gap, justify-content).
 * Do NOT add padding, border, or background to your footer content.
 *
 * Example footer styles:
 * .footer {
 *   display: flex;
 *   justify-content: flex-end;
 *   gap: 12px;
 *   width: 100%;
 * }
 */

'use client';

import React, { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './HubComplexModal.module.css';

export interface HubComplexModalProps {
  // Required
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;

  // Optional - Basic
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;

  // Optional - Behavior
  showCloseButton?: boolean;      // Default: true
  closeOnOverlayClick?: boolean;  // Default: true
  closeOnEscape?: boolean;        // Default: true
  preventBodyScroll?: boolean;    // Default: true
  onBeforeClose?: () => boolean | Promise<boolean>;

  // Optional - Loading
  isLoading?: boolean;
  loadingText?: string;

  // Optional - Styling
  className?: string;
}

export default function HubComplexModal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  preventBodyScroll = true,
  onBeforeClose,
  isLoading = false,
  loadingText,
  className = '',
}: HubComplexModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle close with onBeforeClose callback
  const handleClose = async () => {
    if (onBeforeClose) {
      const canClose = await onBeforeClose();
      if (!canClose) return;
    }
    onClose();
  };

  // Escape key handler
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, closeOnEscape, onBeforeClose]);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen || !preventBodyScroll) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, preventBodyScroll]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on open
    setTimeout(() => firstElement?.focus(), 100);

    // Trap focus inside modal
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  // Build size class
  const sizeClass = size === 'sm' ? styles.modalSm
    : size === 'md' ? styles.modalMd
    : size === 'xl' ? styles.modalXl
    : styles.modalLg;

  const modalContent = (
    <div className={styles.overlay} onClick={closeOnOverlayClick ? handleClose : undefined}>
      <div
        ref={modalRef}
        className={`${styles.modal} ${sizeClass} ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h2 id="modal-title" className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {showCloseButton && (
            <button
              onClick={handleClose}
              className={styles.closeButton}
              aria-label="Close modal"
              type="button"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content - Zero padding, children control layout */}
        <div className={styles.content}>
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className={styles.footer}>
            {footer}
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner} />
            {loadingText && <p className={styles.loadingText}>{loadingText}</p>}
          </div>
        )}
      </div>
    </div>
  );

  // Render in portal at document.body level
  return createPortal(modalContent, document.body);
}
