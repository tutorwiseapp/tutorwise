/**
 * VirtualSpace Analytics Dashboard (v1.0)
 *
 * Tutor-facing analytics: sessions, duration, topics, homework completion.
 *
 * @path /virtualspace/analytics
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart2, ChevronLeft, Clock, CheckCircle, BookOpen, Brain, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface AnalyticsData {
  summary: {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    sessionsThisMonth: number;
    sessionsThisWeek: number;
    avgDurationMins: number | null;
    totalHomework: number;
    completedHomework: number;
    homeworkCompletionRate: number | null;
  };
  topTopics: { topic: string; count: number }[];
  sessionsPerWeek: { week: string; count: number }[];
  recentSessions: {
    id: string;
    title: string;
    status: string;
    type: string;
    createdAt: string;
    hasReport: boolean;
  }[];
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12 }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8' }}>{sub}</div>}
    </div>
  );
}

function MiniBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: '#475569', width: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 4, height: 8 }}>
        <div style={{ width: `${pct}%`, background: '#006c67', borderRadius: 4, height: '100%', transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 11, color: '#64748b', width: 20, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/virtualspace/analytics')
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  const maxWeekCount = data ? Math.max(...data.sessionsPerWeek.map((w) => w.count), 1) : 1;
  const maxTopicCount = data?.topTopics?.[0]?.count || 1;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Back */}
        <button
          onClick={() => router.push('/virtualspace')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#64748b', fontSize: 14, marginBottom: 24, padding: 0,
          }}
        >
          <ChevronLeft size={16} />
          Back to VirtualSpace
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <BarChart2 size={24} color="#006c67" />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Analytics</h1>
        </div>

        {loading && <div style={{ textAlign: 'center', color: '#64748b', padding: 60 }}>Loading…</div>}

        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              <StatCard icon={<TrendingUp size={13} />} label="Total Sessions" value={data.summary.totalSessions} />
              <StatCard icon={<TrendingUp size={13} />} label="This Month" value={data.summary.sessionsThisMonth} sub="last 30 days" />
              <StatCard icon={<TrendingUp size={13} />} label="This Week" value={data.summary.sessionsThisWeek} sub="last 7 days" />
              <StatCard
                icon={<Clock size={13} />}
                label="Avg Duration"
                value={data.summary.avgDurationMins ? `${data.summary.avgDurationMins}m` : '—'}
                sub="per session"
              />
              <StatCard icon={<CheckCircle size={13} />} label="Completed" value={data.summary.completedSessions} />
              <StatCard
                icon={<BookOpen size={13} />}
                label="Homework Rate"
                value={data.summary.homeworkCompletionRate !== null ? `${data.summary.homeworkCompletionRate}%` : '—'}
                sub={`${data.summary.completedHomework}/${data.summary.totalHomework} completed`}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Sessions per week */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={14} color="#006c67" />
                  Sessions per Week
                </h3>
                {data.sessionsPerWeek.map((w) => (
                  <MiniBar key={w.week} value={w.count} max={maxWeekCount} label={w.week} />
                ))}
              </div>

              {/* Top topics */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Brain size={14} color="#7c3aed" />
                  Topics Covered
                </h3>
                {data.topTopics.length === 0 && (
                  <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
                    Topics appear here once sessions have AI reports.
                  </p>
                )}
                {data.topTopics.map((t) => (
                  <MiniBar key={t.topic} value={t.count} max={maxTopicCount} label={t.topic} />
                ))}
              </div>
            </div>

            {/* Recent sessions */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Recent Sessions</h3>
              {data.recentSessions.length === 0 && (
                <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>No sessions yet.</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {data.recentSessions.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 0',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                    }}
                    onClick={() => router.push(`/virtualspace/${s.id}`)}
                  >
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: s.status === 'active' ? '#22c55e' : '#94a3b8',
                      flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.title || 'Untitled'}
                    </span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                      {new Date(s.createdAt).toLocaleDateString('en-GB', { dateStyle: 'short' })}
                    </span>
                    {s.hasReport && (
                      <span style={{ fontSize: 10, color: '#006c67', background: '#f0faf9', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                        Report
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
