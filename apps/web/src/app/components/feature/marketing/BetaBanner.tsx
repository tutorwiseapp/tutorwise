/**
 * Filename: BetaBanner.tsx
 * Purpose: Beta launch announcement banner with typewriter effect
 * Position: Between hero section and main content on homepage
 * Created: 2026-01-24
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen } from 'lucide-react';
import styles from './BetaBanner.module.css';

const PHRASES = [
  'clients with tutors',
  'agents with tutors',
  'tutors with tutors',
];

const TYPING_SPEED = 50; // ms per character
const ERASING_SPEED = 30; // ms per character
const PAUSE_DURATION = 2500; // ms to pause after typing complete

export default function BetaBanner() {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

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
      setDisplayedText(currentPhrase.slice(0, displayedText.length + 1));
    } else {
      setIsTyping(false);
      setIsPaused(true);
    }
  }, [displayedText, currentPhrase]);

  const eraseCharacter = useCallback(() => {
    if (displayedText.length > 0) {
      setDisplayedText(displayedText.slice(0, -1));
    } else {
      // Move to next phrase
      setCurrentPhraseIndex((prev) => (prev + 1) % PHRASES.length);
      setIsTyping(true);
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

    if (isPaused) {
      timeout = setTimeout(() => {
        setIsPaused(false);
      }, PAUSE_DURATION);
    } else if (isTyping) {
      timeout = setTimeout(typeNextCharacter, TYPING_SPEED);
    } else {
      timeout = setTimeout(eraseCharacter, ERASING_SPEED);
    }

    return () => clearTimeout(timeout);
  }, [displayedText, isTyping, isPaused, typeNextCharacter, eraseCharacter, prefersReducedMotion, currentPhrase]);

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <BookOpen className={styles.icon} size={18} strokeWidth={2} />
        <span className={styles.staticText}>We&apos;re in Beta – Connecting </span>
        <span className={styles.typedText}>
          {displayedText}
          <span className={styles.cursor}>|</span>
        </span>
      </div>
    </div>
  );
}
