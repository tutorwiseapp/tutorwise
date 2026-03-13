/**
 * AgentTypeBadge - Displays agent type as a colored inline badge
 * Reuses AGENT_TYPE_METADATA from sage for labels
 */

'use client';

import React from 'react';

export type AgentType = 'tutor' | 'coursework' | 'study_buddy' | 'research_assistant' | 'exam_prep';

const AGENT_TYPE_CONFIG: Record<AgentType, { label: string; color: string; bg: string }> = {
  tutor: { label: 'Tutor', color: '#1d4ed8', bg: '#dbeafe' },
  coursework: { label: 'Coursework', color: '#7c3aed', bg: '#ede9fe' },
  study_buddy: { label: 'Study Buddy', color: '#059669', bg: '#d1fae5' },
  research_assistant: { label: 'Research', color: '#d97706', bg: '#fef3c7' },
  exam_prep: { label: 'Exam Prep', color: '#dc2626', bg: '#fee2e2' },
};

interface AgentTypeBadgeProps {
  type: AgentType;
  size?: 'sm' | 'md';
}

export default function AgentTypeBadge({ type, size = 'sm' }: AgentTypeBadgeProps) {
  const config = AGENT_TYPE_CONFIG[type] || AGENT_TYPE_CONFIG.tutor;

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: size === 'sm' ? '2px 8px' : '4px 12px',
    fontSize: size === 'sm' ? '11px' : '13px',
    fontWeight: 600,
    borderRadius: '12px',
    color: config.color,
    backgroundColor: config.bg,
    whiteSpace: 'nowrap',
    lineHeight: 1.4,
  };

  return <span style={style}>{config.label}</span>;
}
