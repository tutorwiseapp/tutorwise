'use client';

/**
 * Session Timer Component
 *
 * Displays remaining time in AI tutor session with countdown.
 * Shows warning when time is running low.
 *
 * @module components/feature/ai-tutors/session/SessionTimer
 */

import styles from './SessionTimer.module.css';

interface SessionTimerProps {
  timeRemaining: number; // seconds
}

export default function SessionTimer({ timeRemaining }: SessionTimerProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  // Show warning when less than 5 minutes remaining
  const isWarning = timeRemaining <= 300;
  const isCritical = timeRemaining <= 60;

  return (
    <div className={`${styles.timer} ${isWarning ? styles.timerWarning : ''} ${isCritical ? styles.timerCritical : ''}`}>
      <svg className={styles.timerIcon} width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <span className={styles.timerText}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
