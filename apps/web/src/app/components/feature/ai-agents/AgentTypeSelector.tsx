/**
 * Agent Type Selector Component
 *
 * Allows users to select which type of AI agent to create:
 * - Tutor (general tutoring)
 * - Coursework (essay/assignment help)
 * - Study Buddy (flashcards, quizzes)
 * - Research Assistant (literature review, citations)
 * - Exam Prep (past papers, exam technique)
 *
 * Created: 2026-02-27
 * Phase: 4 - UI Updates
 */

'use client';

import { useState } from 'react';
import type { AIAgentType } from '@sage/agents';
import styles from './AgentTypeSelector.module.css';

interface AgentTypeOption {
  type: AIAgentType;
  label: string;
  description: string;
  capabilities: string[];
  defaultSubject?: string;
  recommended?: boolean;
}

const AGENT_TYPES: AgentTypeOption[] = [
  {
    type: 'tutor',
    label: 'AI Tutor',
    description: 'General tutoring across subjects and levels',
    capabilities: ['Explain concepts', 'Solve problems', 'Homework help', 'Exam prep'],
    recommended: true,
  },
  {
    type: 'coursework',
    label: 'Coursework Assistant',
    description: 'Help with essays, projects, and assignments',
    capabilities: ['Essay feedback', 'Research help', 'Proofreading', 'Structure guidance'],
    defaultSubject: 'english',
  },
  {
    type: 'study_buddy',
    label: 'Study Buddy',
    description: 'Interactive study companion and revision helper',
    capabilities: ['Flashcards', 'Quizzes', 'Revision strategies', 'Motivation support'],
  },
  {
    type: 'research_assistant',
    label: 'Research Assistant',
    description: 'Academic research and writing support',
    capabilities: ['Literature review', 'Source evaluation', 'Argument development', 'Writing help'],
    defaultSubject: 'general',
  },
  {
    type: 'exam_prep',
    label: 'Exam Prep Coach',
    description: 'Specialized exam preparation and technique',
    capabilities: ['Past papers', 'Exam technique', 'Time management', 'Revision planning'],
  },
];

interface AgentTypeSelectorProps {
  selectedType: AIAgentType;
  onChange: (type: AIAgentType) => void;
  variant?: 'cards' | 'radio';
}

export default function AgentTypeSelector({
  selectedType,
  onChange,
  variant = 'cards',
}: AgentTypeSelectorProps) {
  if (variant === 'radio') {
    return <RadioVariant selectedType={selectedType} onChange={onChange} />;
  }

  return <CardsVariant selectedType={selectedType} onChange={onChange} />;
}

// Card-based variant (visual, for creation flow)
function CardsVariant({
  selectedType,
  onChange,
}: {
  selectedType: AIAgentType;
  onChange: (type: AIAgentType) => void;
}) {
  return (
    <div className={styles.cardsContainer}>
      <div className={styles.cardsGrid}>
        {AGENT_TYPES.map((option) => (
          <button
            key={option.type}
            type="button"
            className={`${styles.agentCard} ${
              selectedType === option.type ? styles.selected : ''
            }`}
            onClick={() => onChange(option.type)}
            aria-pressed={selectedType === option.type}
          >
            <div className={styles.cardHeader}>
              <h3 className={styles.label}>
                {option.label}
                {option.recommended && (
                  <span className={styles.recommendedBadge}>Recommended</span>
                )}
              </h3>
            </div>

            <p className={styles.description}>{option.description}</p>

            <ul className={styles.capabilities}>
              {option.capabilities.map((capability) => (
                <li key={capability}>
                  <span className={styles.checkmark}>✓</span>
                  {capability}
                </li>
              ))}
            </ul>

            {selectedType === option.type && (
              <div className={styles.selectedIndicator}>
                <span className={styles.checkCircle}>✓</span>
                Selected
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Radio button variant (compact, for filters)
function RadioVariant({
  selectedType,
  onChange,
}: {
  selectedType: AIAgentType;
  onChange: (type: AIAgentType) => void;
}) {
  return (
    <div className={styles.radioContainer}>
      {AGENT_TYPES.map((option) => (
        <label
          key={option.type}
          className={`${styles.radioOption} ${
            selectedType === option.type ? styles.selected : ''
          }`}
        >
          <input
            type="radio"
            name="agent-type"
            value={option.type}
            checked={selectedType === option.type}
            onChange={() => onChange(option.type)}
            className={styles.radioInput}
          />
          <span className={styles.radioLabel}>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

// Export helper function to get agent type metadata
export function getAgentTypeMetadata(type: AIAgentType) {
  return AGENT_TYPES.find((t) => t.type === type);
}

export { AGENT_TYPES };
export type { AgentTypeOption };
