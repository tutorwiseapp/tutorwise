'use client';

/**
 * Lexi Chat Modal
 *
 * Floating chat modal that can be triggered from anywhere in the app.
 * Includes a floating action button and slide-up chat panel.
 * Supports toggling between chat and history views.
 * Includes proactive message triggers based on user context.
 *
 * @module components/feature/lexi/LexiChatModal
 */

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import LexiChat from './LexiChat';
import LexiHistory from './LexiHistory';
import LexiErrorBoundary from './LexiErrorBoundary';
import styles from './LexiChatModal.module.css';

// --- Types ---

type ModalView = 'chat' | 'history';

interface ProactiveMessage {
  id: string;
  message: string;
  trigger: string;
  dismissed?: boolean;
}

interface LexiChatModalProps {
  defaultOpen?: boolean;
  defaultView?: ModalView;
  position?: 'bottom-right' | 'bottom-left';
}

// --- Proactive Message Triggers ---

const PROACTIVE_TRIGGERS: Array<{
  id: string;
  pathMatch: string | RegExp;
  message: string;
  delay?: number;
}> = [
  {
    id: 'edupay-help',
    pathMatch: '/edupay',
    message: "Have questions about your wallet or cashback? I can help!",
    delay: 3000,
  },
  {
    id: 'booking-help',
    pathMatch: '/bookings',
    message: "Need help scheduling or managing a booking?",
    delay: 5000,
  },
  {
    id: 'listing-create-help',
    pathMatch: '/listings/create',
    message: "Creating your first listing? I can guide you through it!",
    delay: 3000,
  },
  {
    id: 'financials-help',
    pathMatch: '/financials',
    message: "Questions about earnings, payouts, or commissions?",
    delay: 4000,
  },
  {
    id: 'onboarding-help',
    pathMatch: /^\/onboarding/,
    message: "Hi! I'm Lexi. Need help completing your profile?",
    delay: 5000,
  },
];

// --- Component ---

export default function LexiChatModal({
  defaultOpen = false,
  defaultView = 'chat',
  position = 'bottom-right',
}: LexiChatModalProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [view, setView] = useState<ModalView>(defaultView);
  const [isMounted, setIsMounted] = useState(false);
  const [proactiveMessage, setProactiveMessage] = useState<ProactiveMessage | null>(null);
  const [dismissedMessages, setDismissedMessages] = useState<Set<string>>(new Set());
  const pathname = usePathname();

  // Handle client-side mounting for portal
  useEffect(() => {
    setIsMounted(true);
    // Load dismissed messages from localStorage
    const stored = localStorage.getItem('lexi-dismissed-messages');
    if (stored) {
      setDismissedMessages(new Set(JSON.parse(stored)));
    }
  }, []);

  // Proactive message triggers based on current path
  useEffect(() => {
    if (!isMounted || isOpen) return;

    const trigger = PROACTIVE_TRIGGERS.find(t => {
      if (typeof t.pathMatch === 'string') {
        return pathname?.startsWith(t.pathMatch);
      }
      return t.pathMatch.test(pathname || '');
    });

    if (trigger && !dismissedMessages.has(trigger.id)) {
      const timer = setTimeout(() => {
        setProactiveMessage({
          id: trigger.id,
          message: trigger.message,
          trigger: pathname || '',
        });
      }, trigger.delay || 3000);

      return () => clearTimeout(timer);
    } else {
      setProactiveMessage(null);
    }
  }, [pathname, isMounted, isOpen, dismissedMessages]);

  const dismissProactiveMessage = useCallback((id: string) => {
    setProactiveMessage(null);
    setDismissedMessages(prev => {
      const next = new Set(prev).add(id);
      localStorage.setItem('lexi-dismissed-messages', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const handleProactiveClick = useCallback(() => {
    if (proactiveMessage) {
      dismissProactiveMessage(proactiveMessage.id);
      setIsOpen(true);
      setView('chat');
    }
  }, [proactiveMessage, dismissProactiveMessage]);

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
                autoStart={false}
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

      {/* Proactive message bubble */}
      {proactiveMessage && !isOpen && (
        <div className={styles.proactiveBubble}>
          <p className={styles.proactiveText}>{proactiveMessage.message}</p>
          <div className={styles.proactiveActions}>
            <button
              className={styles.proactiveChat}
              onClick={handleProactiveClick}
            >
              Chat with Lexi
            </button>
            <button
              className={styles.proactiveDismiss}
              onClick={() => dismissProactiveMessage(proactiveMessage.id)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
