'use client';

import { X, Clock, Brain, CheckCircle2, Accessibility } from 'lucide-react';
import { SessionWorkflow, AI_INVOLVEMENT_LABELS, AI_INVOLVEMENT_COLOURS, LEVEL_LABELS } from './types';

interface WorkflowPreviewModalProps {
  workflow: SessionWorkflow;
  onClose: () => void;
  onSelect: (workflow: SessionWorkflow) => void;
}

const SAGE_MODE_LABELS: Record<string, string> = {
  full: 'Sage Leads',
  hints: 'Sage Hints',
  silent: 'Sage Silent',
  'co-teach': 'Co-Teach',
};

const SAGE_MODE_COLOURS: Record<string, string> = {
  full: '#006c67',
  hints: '#6366f1',
  silent: '#64748b',
  'co-teach': '#f59e0b',
};

export function WorkflowPreviewModal({ workflow, onClose, onSelect }: WorkflowPreviewModalProps) {
  const aiColour = AI_INVOLVEMENT_COLOURS[workflow.ai_involvement] || '#64748b';
  const totalPhaseMins = workflow.phases.reduce((s, p) => s + p.durationMins, 0);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff',
        borderRadius: 14,
        width: '100%',
        maxWidth: 560,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          position: 'sticky',
          top: 0,
          background: '#fff',
          borderRadius: '14px 14px 0 0',
        }}>
          <span style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>{workflow.theme.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#1e293b' }}>{workflow.name}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 3, lineHeight: 1.4 }}>
              {workflow.description || workflow.short_description}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ display:'flex', alignItems:'center', gap:3, background:'#f1f5f9', borderRadius:4, padding:'2px 8px', fontSize:11, color:'#475569' }}>
                <Clock size={10} /> {totalPhaseMins} min
              </span>
              <span style={{ background:'#f1f5f9', borderRadius:4, padding:'2px 8px', fontSize:11, color:'#475569' }}>
                {LEVEL_LABELS[workflow.level] || workflow.level}
              </span>
              <span style={{ display:'flex', alignItems:'center', gap:3, background:`${aiColour}15`, borderRadius:4, padding:'2px 8px', fontSize:11, color:aiColour, fontWeight:500 }}>
                <Brain size={10} /> {AI_INVOLVEMENT_LABELS[workflow.ai_involvement]}
              </span>
              {workflow.sen_focus && (
                <span style={{ display:'flex', alignItems:'center', gap:3, background:'#10b98115', borderRadius:4, padding:'2px 8px', fontSize:11, color:'#10b981', fontWeight:500 }}>
                  <Accessibility size={10} /> SEN
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:4, flexShrink:0 }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Narrative */}
          <div style={{
            background: `${workflow.theme.colour}10`,
            borderLeft: `3px solid ${workflow.theme.colour}`,
            borderRadius: '0 8px 8px 0',
            padding: '12px 14px',
            fontSize: 13,
            color: '#334155',
            lineHeight: 1.6,
            fontStyle: 'italic',
          }}>
            {workflow.theme.narrative}
          </div>

          {/* Session Arc */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Session Arc
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {workflow.phases.map((phase, i) => {
                const modeColour = SAGE_MODE_COLOURS[phase.sageMode] || '#64748b';
                return (
                  <div key={phase.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {/* Step indicator */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: `${workflow.theme.colour}15`,
                        border: `2px solid ${workflow.theme.colour}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14,
                      }}>
                        {phase.icon}
                      </div>
                      {i < workflow.phases.length - 1 && (
                        <div style={{ width: 1, flex: 1, minHeight: 10, background: '#e2e8f0', margin: '3px 0' }} />
                      )}
                    </div>
                    {/* Phase info */}
                    <div style={{ flex: 1, paddingBottom: i < workflow.phases.length - 1 ? 8 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{phase.name}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{phase.durationMins} min</span>
                        <span style={{
                          fontSize: 10, fontWeight: 500,
                          color: modeColour,
                          background: `${modeColour}12`,
                          padding: '1px 6px', borderRadius: 3,
                        }}>
                          {SAGE_MODE_LABELS[phase.sageMode]}
                        </span>
                        {phase.homeworkEnabled && (
                          <span style={{ fontSize: 10, color: '#f59e0b', background: '#fef3c7', padding: '1px 6px', borderRadius: 3 }}>
                            HW
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>
                        {phase.narrative}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Best for */}
          {workflow.learn_your_way?.bestFor && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Best For
              </div>
              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                {workflow.learn_your_way.bestFor}
              </div>
            </div>
          )}

          {/* Agency points */}
          {workflow.learn_your_way?.agencyPoints?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Your Control
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {workflow.learn_your_way.agencyPoints.map((point, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 13, color: '#334155' }}>
                    <CheckCircle2 size={14} color="#006c67" style={{ flexShrink: 0, marginTop: 1 }} />
                    {point}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          gap: 10,
          position: 'sticky',
          bottom: 0,
          background: '#fff',
          borderRadius: '0 0 14px 14px',
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, background: 'none', border: '1px solid #e2e8f0',
              borderRadius: 8, padding: '10px 0', fontSize: 13,
              color: '#64748b', cursor: 'pointer', fontWeight: 500,
            }}
          >
            Choose Different
          </button>
          <button
            onClick={() => onSelect(workflow)}
            style={{
              flex: 2, background: workflow.theme.colour, border: 'none',
              borderRadius: 8, padding: '10px 0', fontSize: 13,
              color: '#fff', cursor: 'pointer', fontWeight: 700,
            }}
          >
            Start Session →
          </button>
        </div>
      </div>
    </div>
  );
}
