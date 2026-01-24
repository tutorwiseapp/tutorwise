/**
 * Filename: BetaBanner.tsx
 * Purpose: Beta launch announcement banner with typewriter effect
 * Position: Between hero section and main content on homepage
 * Created: 2026-01-24
 * Updated: 2026-01-24 - New phrase sequence, solid teal, clickable CTA
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './BetaBanner.module.css';

const PHRASES = [
  'Beta Launch: Free to Join',
  'Connecting clients, tutors & agents',
  'Finding your perfect tutor... in seconds.',
  'Refer tutors/clients – earn 10%',
];

const TYPING_SPEED = 70; // ms per character
const ERASING_SPEED = 40; // ms per character
const PAUSE_DURATION = 2200; // ms to pause after typing complete
const DELAY_BEFORE_NEXT = 600; // ms delay before starting next phrase

export default function BetaBanner() {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isDelaying, setIsDelaying] = useState(false);

  // Respect user's motion preferences
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const currentPhrase = PHRASES[currentPhraseIndex];

  const typeNextCharacter = useCallback(() => {
    if (displayedText.length < currentPhrase.length) {
      const nextChar = currentPhrase[displayedText.length];
      // Add slight extra pause after ellipsis for natural feel
      const isAfterEllipsis = displayedText.endsWith('...');
      const delay = isAfterEllipsis ? TYPING_SPEED * 3 : TYPING_SPEED;

      setTimeout(() => {
        setDisplayedText(currentPhrase.slice(0, displayedText.length + 1));
      }, isAfterEllipsis ? delay - TYPING_SPEED : 0);
    } else {
      setIsTyping(false);
      setIsPaused(true);
    }
  }, [displayedText, currentPhrase]);

  const eraseCharacter = useCallback(() => {
    if (displayedText.length > 0) {
      setDisplayedText(displayedText.slice(0, -1));
    } else {
      // Delay before starting next phrase
      setIsDelaying(true);
    }
  }, [displayedText]);

  useEffect(() => {
    // If reduced motion, just show full text without animation
    if (prefersReducedMotion) {
      setDisplayedText(currentPhrase);
      const interval = setInterval(() => {
        setCurrentPhraseIndex((prev) => (prev + 1) % PHRASES.length);
      }, 4000);
      return () => clearInterval(interval);
    }

    let timeout: NodeJS.Timeout;

    if (isDelaying) {
      timeout = setTimeout(() => {
        setIsDelaying(false);
        setCurrentPhraseIndex((prev) => (prev + 1) % PHRASES.length);
        setIsTyping(true);
      }, DELAY_BEFORE_NEXT);
    } else if (isPaused) {
      timeout = setTimeout(() => {
        setIsPaused(false);
      }, PAUSE_DURATION);
    } else if (isTyping) {
      timeout = setTimeout(typeNextCharacter, TYPING_SPEED);
    } else {
      timeout = setTimeout(eraseCharacter, ERASING_SPEED);
    }

    return () => clearTimeout(timeout);
  }, [displayedText, isTyping, isPaused, isDelaying, typeNextCharacter, eraseCharacter, prefersReducedMotion, currentPhrase]);

  return (
    <Link href="/signup" className={styles.banner}>
      <div className={styles.content}>
        <span className={styles.typedText}>
          {displayedText}
          <span className={styles.cursor}>|</span>
        </span>
      </div>
    </Link>
  );
}
