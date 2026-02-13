'use client';

/**
 * Lexi Chat Modal
 *
 * Floating chat modal that can be triggered from anywhere in the app.
 * Includes a floating action button and slide-up chat panel.
 * Supports toggling between chat and history views.
 *
 * @module components/feature/lexi/LexiChatModal
 */

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import LexiChat from './LexiChat';
import LexiHistory from './LexiHistory';
import LexiErrorBoundary from './LexiErrorBoundary';
import styles from './LexiChatModal.module.css';

// --- Types ---

type ModalView = 'chat' | 'history';

interface LexiChatModalProps {
  defaultOpen?: boolean;
  defaultView?: ModalView;
  position?: 'bottom-right' | 'bottom-left';
}

// --- Component ---

export default function LexiChatModal({
  defaultOpen = false,
  defaultView = 'chat',
  position = 'bottom-right',
}: LexiChatModalProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [view, setView] = useState<ModalView>(defaultView);
  const [isMounted, setIsMounted] = useState(false);

  // Handle client-side mounting for portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
    // Reset to chat view when opening
    if (!isOpen) {
      setView('chat');
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const _handleShowHistory = useCallback(() => {
    setView('history');
  }, []);

  const handleStartNewChat = useCallback(() => {
    setView('chat');
  }, []);

  if (!isMounted) return null;

  const positionClass = position === 'bottom-left' ? styles.positionLeft : styles.positionRight;

  return createPortal(
    <div className={`${styles.container} ${positionClass}`}>
      {/* Chat panel */}
      <div className={`${styles.chatPanel} ${isOpen ? styles.chatPanelOpen : ''}`}>
        {/* View toggle buttons */}
        {isOpen && (
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewToggleButton} ${view === 'chat' ? styles.viewToggleActive : ''}`}
              onClick={() => setView('chat')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6.625 10.333A1.333 1.333 0 0 0 5.667 9.375l-4.09-1.054a.333.333 0 0 1 0-.642l4.09-1.055A1.333 1.333 0 0 0 6.625 5.667l1.054-4.09a.333.333 0 0 1 .642 0l1.054 4.09a1.333 1.333 0 0 0 .958.957l4.09 1.055a.333.333 0 0 1 0 .642l-4.09 1.054a1.333 1.333 0 0 0-.958.958l-1.054 4.09a.333.333 0 0 1-.642 0z" stroke="currentColor" fill="none" strokeWidth="1"/>
                <path d="M13.333 2v2.667M14.667 3.333h-2.667M2.667 11.333V12.667M3.333 12H2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              AI Agent
            </button>
            <button
              className={`${styles.viewToggleButton} ${view === 'history' ? styles.viewToggleActive : ''}`}
              onClick={() => setView('history')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 4V8L10.5 10.5M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              History
            </button>
          </div>
        )}

        {/* Content */}
        <div className={styles.panelContent}>
          <LexiErrorBoundary>
            {view === 'chat' ? (
              <LexiChat
                onClose={handleClose}
                autoStart={isOpen && view === 'chat'}
              />
            ) : (
              <LexiHistory
                onClose={handleClose}
                onStartNewChat={handleStartNewChat}
              />
            )}
          </LexiErrorBoundary>
        </div>
      </div>

      {/* Floating action button */}
      <button
        className={`${styles.fab} ${isOpen ? styles.fabActive : ''}`}
        onClick={handleToggle}
        aria-label={isOpen ? 'Close Lexi chat' : 'Open Lexi chat'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" stroke="currentColor" fill="none" strokeWidth="1.5"/>
            <path d="M20 3v4M22 5h-4M4 17v2M5 18H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
        {!isOpen && (
          <span className={styles.fabLabel}>Ask Lexi</span>
        )}
      </button>
    </div>,
    document.body
  );
}

export { LexiChatModal };
