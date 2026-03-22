'use client';

import { Clock, Brain, Accessibility } from 'lucide-react';
import { SessionWorkflow, AI_INVOLVEMENT_LABELS, AI_INVOLVEMENT_COLOURS, LEVEL_LABELS } from './types';

interface WorkflowCardProps {
  workflow: SessionWorkflow;
  onPreview: (workflow: SessionWorkflow) => void;
  onSelect: (workflow: SessionWorkflow) => void;
}

export function WorkflowCard({ workflow, onPreview, onSelect }: WorkflowCardProps) {
  const aiColour = AI_INVOLVEMENT_COLOURS[workflow.ai_involvement] || '#64748b';
  const totalMins = workflow.duration_mins;

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderLeft: `4px solid ${workflow.theme.colour}`,
        borderRadius: 10,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        cursor: 'default',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{workflow.theme.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', lineHeight: 1.3 }}>
            {workflow.name}
          </div>
          {workflow.short_description && (
            <div style={{
              fontSize: 12,
              color: '#64748b',
              marginTop: 3,
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {workflow.short_description}
            </div>
          )}
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {/* Duration */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          background: '#f1f5f9', borderRadius: 4, padding: '2px 7px',
          fontSize: 11, color: '#475569',
        }}>
          <Clock size={10} />
          {totalMins} min
        </span>

        {/* Level */}
        <span style={{
          background: '#f1f5f9', borderRadius: 4, padding: '2px 7px',
          fontSize: 11, color: '#475569',
        }}>
          {LEVEL_LABELS[workflow.level] || workflow.level}
        </span>

        {/* AI involvement */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          background: `${aiColour}15`, borderRadius: 4, padding: '2px 7px',
          fontSize: 11, color: aiColour, fontWeight: 500,
        }}>
          <Brain size={10} />
          {AI_INVOLVEMENT_LABELS[workflow.ai_involvement] || workflow.ai_involvement}
        </span>

        {/* SEN badge */}
        {workflow.sen_focus && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: '#10b98115', borderRadius: 4, padding: '2px 7px',
            fontSize: 11, color: '#10b981', fontWeight: 500,
          }}>
            <Accessibility size={10} />
            SEN
          </span>
        )}
      </div>

      {/* Phase arc preview */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {workflow.phases.slice(0, 5).map((phase, i) => (
          <div key={phase.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 13 }} title={phase.name}>{phase.icon}</span>
            {i < Math.min(workflow.phases.length - 1, 4) && (
              <span style={{ fontSize: 10, color: '#cbd5e1' }}>→</span>
            )}
          </div>
        ))}
        {workflow.phases.length > 5 && (
          <span style={{ fontSize: 11, color: '#94a3b8' }}>+{workflow.phases.length - 5}</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button
          onClick={() => onPreview(workflow)}
          style={{
            flex: 1,
            background: 'none',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            padding: '7px 0',
            fontSize: 12,
            color: '#475569',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Preview
        </button>
        <button
          onClick={() => onSelect(workflow)}
          style={{
            flex: 2,
            background: workflow.theme.colour,
            border: 'none',
            borderRadius: 6,
            padding: '7px 0',
            fontSize: 12,
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Learn This Way →
        </button>
      </div>
    </div>
  );
}
