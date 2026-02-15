'use client';

/**
 * Sage Handoff Component
 *
 * Displays a "Talk to Sage" prompt when Lexi detects educational queries.
 * Allows seamless handoff from Lexi (general assistant) to Sage (AI tutor).
 *
 * @module components/feature/lexi/SageHandoff
 */

import React, { useState, useCallback } from 'react';
import styles from './SageHandoff.module.css';

// --- Types ---

interface SageHandoffProps {
  /** The educational topic detected from the conversation */
  topic?: string;
  /** The subject area (maths, english, science) */
  subject?: 'maths' | 'english' | 'science' | 'general';
  /** Messages to transfer to Sage */
  conversationContext?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Callback when user accepts handoff */
  onAccept?: () => void;
  /** Callback when user dismisses handoff */
  onDismiss?: () => void;
}

// --- Detection Logic ---

/**
 * Detect if a message is educational in nature
 */
export function detectEducationalIntent(message: string): {
  isEducational: boolean;
  subject?: 'maths' | 'english' | 'science' | 'general';
  topic?: string;
  confidence: number;
} {
  const messageLower = message.toLowerCase();

  // Maths keywords
  const mathsKeywords = [
    'equation', 'solve', 'calculate', 'algebra', 'geometry', 'calculus',
    'fraction', 'percentage', 'quadratic', 'graph', 'formula', 'proof',
    'derivative', 'integral', 'trigonometry', 'pythagoras', 'simultaneous',
    'factorise', 'expand', 'simplify', 'coefficient', 'exponent',
  ];

  // English keywords
  const englishKeywords = [
    'essay', 'grammar', 'punctuation', 'spelling', 'vocabulary', 'writing',
    'literature', 'poem', 'novel', 'shakespeare', 'metaphor', 'simile',
    'paragraph', 'thesis', 'argument', 'quotation', 'analysis', 'comprehension',
  ];

  // Science keywords
  const scienceKeywords = [
    'physics', 'chemistry', 'biology', 'experiment', 'hypothesis', 'atom',
    'molecule', 'cell', 'photosynthesis', 'evolution', 'newton', 'gravity',
    'energy', 'force', 'reaction', 'element', 'periodic table', 'dna',
    'ecosystem', 'organism', 'circuit', 'voltage', 'current',
  ];

  // General educational keywords
  const educationalKeywords = [
    'homework', 'study', 'exam', 'revision', 'gcse', 'a-level', 'coursework',
    'explain', 'understand', 'learn', 'topic', 'subject', 'teacher',
    'lesson', 'practice', 'test', 'quiz', 'help me with',
  ];

  let subject: 'maths' | 'english' | 'science' | 'general' | undefined;
  let confidence = 0;
  let topic: string | undefined;

  // Check for maths
  const mathsMatches = mathsKeywords.filter(k => messageLower.includes(k));
  if (mathsMatches.length > 0) {
    subject = 'maths';
    confidence = Math.min(0.5 + mathsMatches.length * 0.15, 0.95);
    topic = mathsMatches[0];
  }

  // Check for English
  const englishMatches = englishKeywords.filter(k => messageLower.includes(k));
  if (englishMatches.length > mathsMatches.length) {
    subject = 'english';
    confidence = Math.min(0.5 + englishMatches.length * 0.15, 0.95);
    topic = englishMatches[0];
  }

  // Check for science
  const scienceMatches = scienceKeywords.filter(k => messageLower.includes(k));
  if (scienceMatches.length > mathsMatches.length && scienceMatches.length > englishMatches.length) {
    subject = 'science';
    confidence = Math.min(0.5 + scienceMatches.length * 0.15, 0.95);
    topic = scienceMatches[0];
  }

  // Check for general educational intent
  const educationalMatches = educationalKeywords.filter(k => messageLower.includes(k));
  if (!subject && educationalMatches.length > 0) {
    subject = 'general';
    confidence = Math.min(0.4 + educationalMatches.length * 0.1, 0.8);
    topic = educationalMatches[0];
  }

  return {
    isEducational: confidence >= 0.5,
    subject,
    topic,
    confidence,
  };
}

// --- Component ---

export default function SageHandoff({
  topic,
  subject,
  conversationContext,
  onAccept,
  onDismiss,
}: SageHandoffProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const handleAccept = useCallback(async () => {
    setIsLoading(true);
    try {
      // Create handoff payload
      const handoffPayload = {
        subject,
        topic,
        conversationContext: conversationContext?.slice(-5), // Last 5 messages
      };

      // Store in sessionStorage for Sage to pick up
      sessionStorage.setItem('sage_handoff', JSON.stringify(handoffPayload));

      // Call onAccept callback (typically navigates to Sage)
      onAccept?.();
    } catch (err) {
      console.error('[SageHandoff] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [subject, topic, conversationContext, onAccept]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  if (dismissed) {
    return null;
  }

  const subjectLabel = subject === 'maths' ? 'Maths'
    : subject === 'english' ? 'English'
    : subject === 'science' ? 'Science'
    : 'learning';

  return (
    <div className={styles.handoff}>
      <div className={styles.handoffContent}>
        <div className={styles.handoffIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3z" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 12l9-4.5M12 12v9M12 12L3 7.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className={styles.handoffText}>
          <strong>Looking for {subjectLabel} help?</strong>
          <span>
            Sage is our AI tutor - better suited for educational questions
            {topic && ` about ${topic}`}.
          </span>
        </div>
      </div>
      <div className={styles.handoffActions}>
        <button
          className={styles.handoffAccept}
          onClick={handleAccept}
          disabled={isLoading}
        >
          {isLoading ? 'Opening...' : 'Talk to Sage'}
        </button>
        <button
          className={styles.handoffDismiss}
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

export { SageHandoff };
