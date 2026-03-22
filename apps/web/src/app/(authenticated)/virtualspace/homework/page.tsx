/**
 * Homework Tracker — student + tutor view (v1.0)
 *
 * Students see their pending/completed homework with Sage practice questions.
 * Tutors see all homework they've set, with completion status.
 *
 * @path /virtualspace/homework
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, CheckCircle, Clock, ChevronLeft, Brain, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUserProfile } from '@/app/contexts/UserProfileContext';

interface PracticeQuestion {
  q: string;
  answer: string;
  hint: string;
}

interface HomeworkItem {
  id: string;
  text: string;
  due_date: string | null;
  practice_questions: PracticeQuestion[] | null;
  completed_at: string | null;
  created_at: string;
  google_classroom_id: string | null;
  session: { id: string; title: string } | null;
  tutor: { full_name: string } | null;
  student: { full_name: string } | null;
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { dateStyle: 'medium' });
}

function isOverdue(dueDate: string | null, completedAt: string | null) {
  if (!dueDate || completedAt) return false;
  return new Date(dueDate) < new Date();
}

function PracticeSection({ questions }: { questions: PracticeQuestion[] }) {
  const [expanded, setExpanded] = useState(false);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: '1px solid #ddd6fe',
          borderRadius: 6,
          padding: '5px 10px',
          cursor: 'pointer',
          fontSize: 12,
          color: '#7c3aed',
          fontWeight: 600,
        }}
      >
        <Brain size={13} />
        {expanded ? 'Hide' : 'Practice Questions'} ({questions.length})
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>

      {expanded && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {questions.map((q, i) => (
            <div key={i} style={{
              background: '#faf5ff',
              border: '1px solid #ddd6fe',
              borderRadius: 8,
              padding: '12px 14px',
            }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, color: '#1e293b', fontWeight: 600 }}>
                Q{i + 1}. {q.q}
              </p>
              {!revealed[i] && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setRevealed((prev) => ({ ...prev, [i]: true }))}
                    style={{
                      fontSize: 11,
                      color: '#64748b',
                      background: 'none',
                      border: '1px solid #e2e8f0',
                      borderRadius: 5,
                      padding: '3px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    Show answer
                  </button>
                </div>
              )}
              {revealed[i] && (
                <div style={{ marginTop: 4 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#065f46', background: '#d1fae5', padding: '4px 8px', borderRadius: 4 }}>
                    ✓ {q.answer}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#78350f', fontStyle: 'italic' }}>
                    Hint: {q.hint}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomeworkPage() {
  const { profile } = useUserProfile();
  const router = useRouter();
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');

  const fetchHomework = useCallback(async () => {
    try {
      const res = await fetch('/api/virtualspace/homework');
      const data = await res.json();
      setHomework(data.homework || []);
    } catch {
      toast.error('Failed to load homework');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHomework(); }, [fetchHomework]);

  const handleMarkComplete = async (id: string) => {
    try {
      const res = await fetch(`/api/virtualspace/homework/${id}`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed');
      setHomework((prev) =>
        prev.map((hw) => hw.id === id ? { ...hw, completed_at: new Date().toISOString() } : hw)
      );
      toast.success('Homework marked as complete!');
    } catch {
      toast.error('Failed to mark as complete');
    }
  };

  const filtered = homework.filter((hw) => {
    if (filter === 'pending') return !hw.completed_at;
    if (filter === 'completed') return !!hw.completed_at;
    return true;
  });

  const pendingCount = homework.filter((hw) => !hw.completed_at).length;
  const completedCount = homework.filter((hw) => !!hw.completed_at).length;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        {/* Back */}
        <button
          onClick={() => router.push('/virtualspace')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b',
            fontSize: 14,
            marginBottom: 24,
            padding: 0,
          }}
        >
          <ChevronLeft size={16} />
          Back to VirtualSpace
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <ClipboardList size={24} color="#7c3aed" />
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Homework</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              {pendingCount} pending · {completedCount} completed
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 2,
          background: '#f1f5f9',
          borderRadius: 8,
          padding: 3,
          marginBottom: 20,
          width: 'fit-content',
        }}>
          {(['pending', 'completed', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                background: filter === f ? '#fff' : 'transparent',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: filter === f ? 600 : 400,
                color: filter === f ? '#1e293b' : '#64748b',
                boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.1s',
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'pending' && pendingCount > 0 && (
                <span style={{
                  marginLeft: 6,
                  background: '#7c3aed',
                  color: '#fff',
                  borderRadius: 10,
                  fontSize: 10,
                  padding: '1px 6px',
                  fontWeight: 700,
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Loading…</div>}

        {!loading && filtered.length === 0 && (
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '40px 24px',
            textAlign: 'center',
            color: '#94a3b8',
          }}>
            <ClipboardList size={40} style={{ marginBottom: 12, color: '#cbd5e1' }} />
            <p style={{ margin: 0 }}>
              {filter === 'pending' ? 'No pending homework — you\'re all caught up!' :
               filter === 'completed' ? 'No completed homework yet.' :
               'No homework assigned yet.'}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((hw) => {
            const overdue = isOverdue(hw.due_date, hw.completed_at);
            return (
              <div
                key={hw.id}
                style={{
                  background: '#fff',
                  border: `1px solid ${overdue ? '#fca5a5' : '#e2e8f0'}`,
                  borderRadius: 12,
                  padding: '16px 20px',
                  borderLeft: hw.completed_at
                    ? '4px solid #22c55e'
                    : overdue
                    ? '4px solid #ef4444'
                    : '4px solid #7c3aed',
                }}
              >
                {/* Meta */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1e293b', lineHeight: 1.5 }}>
                      {hw.text}
                    </p>
                    <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                      {hw.session && (
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          Session: {hw.session.title}
                        </span>
                      )}
                      {hw.tutor && (
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          Tutor: {hw.tutor.full_name}
                        </span>
                      )}
                      {hw.due_date && (
                        <span style={{ fontSize: 11, color: overdue ? '#dc2626' : '#64748b', fontWeight: overdue ? 600 : 400 }}>
                          {overdue ? '⚠️ ' : ''}{hw.completed_at ? 'Was due' : 'Due'}: {formatDate(hw.due_date)}
                        </span>
                      )}
                      {hw.google_classroom_id && (
                        <span style={{ fontSize: 11, color: '#006c67' }}>✓ Posted to Google Classroom</span>
                      )}
                    </div>
                  </div>

                  {/* Status / Action */}
                  {hw.completed_at ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      <CheckCircle size={16} />
                      Done
                    </div>
                  ) : (
                    <button
                      onClick={() => handleMarkComplete(hw.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 12px',
                        background: '#7c3aed',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 7,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <CheckCircle size={13} />
                      Mark Done
                    </button>
                  )}
                </div>

                {/* Practice Questions (Sage-generated) */}
                {hw.practice_questions && hw.practice_questions.length > 0 && !hw.completed_at && (
                  <PracticeSection questions={hw.practice_questions} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
