'use client';

/**
 * LessonPlanDrawer
 *
 * Slide-in drawer showing the tutor's lesson plan library.
 * Allows selecting a plan to load into the current VirtualSpace session.
 * Only rendered for tutors when Sage is active.
 *
 * @module components/feature/virtualspace/LessonPlanDrawer
 */

import { BookOpen, X, Clock, ChevronRight, Loader2 } from 'lucide-react';
import type { UseLessonPlanReturn, LessonPlan } from './hooks/useLessonPlan';

interface LessonPlanDrawerProps {
  lessonPlan: UseLessonPlanReturn;
}

export function LessonPlanDrawer({ lessonPlan }: LessonPlanDrawerProps) {
  const { isDrawerOpen, closeDrawer, plans, isLoading, loadPlan } = lessonPlan;

  if (!isDrawerOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 9990,
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 380,
          background: 'white',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
          zIndex: 9991,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'inherit',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <BookOpen size={18} color="#006c67" />
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827', flex: 1 }}>
            Load a Lesson Plan
          </span>
          <button
            onClick={closeDrawer}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              <Loader2 size={24} color="#006c67" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : plans.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plans.map(plan => (
                <PlanCard key={plan.id} plan={plan} onLoad={() => loadPlan(plan.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #e5e7eb',
            fontSize: '0.75rem',
            color: '#9ca3af',
            textAlign: 'center',
          }}
        >
          Plans are loaded at phase 1. Sage drives the session through each phase.
        </div>
      </div>
    </>
  );
}

// ── PlanCard ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, onLoad }: { plan: LessonPlan; onLoad: () => void }) {
  const levelBadge = plan.level ?? 'GCSE';
  const subject = plan.subject ?? 'General';

  return (
    <button
      onClick={onLoad}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#006c67'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'; }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {plan.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.6875rem', background: '#f0fdf4', color: '#166534', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>
            {levelBadge}
          </span>
          <span style={{ fontSize: '0.6875rem', color: '#6b7280', textTransform: 'capitalize' }}>
            {subject}
          </span>
          {plan.targetDuration && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.6875rem', color: '#6b7280' }}>
              <Clock size={10} />
              {plan.targetDuration} min
            </span>
          )}
          {plan.isTemplate && (
            <span style={{ fontSize: '0.6875rem', background: '#eff6ff', color: '#1e40af', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>
              Template
            </span>
          )}
        </div>
      </div>
      <ChevronRight size={16} color="#9ca3af" />
    </button>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
      <BookOpen size={32} color="#d1d5db" style={{ marginBottom: 12 }} />
      <p style={{ fontWeight: 600, color: '#374151', marginBottom: 8 }}>No lesson plans yet</p>
      <p style={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
        Ask Sage to create a lesson plan in chat, or save one from your account page.
      </p>
    </div>
  );
}
