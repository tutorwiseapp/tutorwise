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
                <path d="M5.5 8H5.505M8 8H8.005M10.5 8H10.505M14 8C14 11.3137 11.3137 14 8 14C6.78053 14 5.64706 13.6456 4.68997 13.0367L2 14L2.96333 11.31C2.34104 10.3484 2 9.21407 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Chat
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
            <path d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.9706 16.9706 21 12 21C10.2289 21 8.57736 20.4884 7.18497 19.605L3 21L4.39499 16.815C3.51156 15.4226 3 13.7711 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
