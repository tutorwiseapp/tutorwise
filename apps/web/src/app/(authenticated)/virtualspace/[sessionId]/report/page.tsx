/**
 * Session Report Page
 * Shows the AI-generated post-session report for tutors and students.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FileText, ChevronLeft, CheckCircle, BookOpen, AlertTriangle, ArrowRight } from 'lucide-react';

interface SessionReport {
  summary: string;
  topicsCovered: string[];
  studentStrugglePoints: string[];
  homeworkSet: string | null;
  recommendedNextSteps: string[];
  sessionDurationMins: number | null;
  generatedAt: string;
}

export default function SessionReportPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [report, setReport] = useState<SessionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch(`/api/virtualspace/${params.sessionId}/report`)
      .then((r) => r.json())
      .then((data) => {
        if (data.report) setReport(data.report);
        else setError('No report available for this session yet.');
      })
      .catch(() => setError('Failed to load report.'))
      .finally(() => setLoading(false));
  }, [params.sessionId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/virtualspace/${params.sessionId}/report`, { method: 'POST' });
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
        setError('');
      } else {
        setError(data.error || 'Generation failed');
      }
    } catch {
      setError('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
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
          Back to sessions
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <FileText size={24} color="#006c67" />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Session Report</h1>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Loading report…</div>
        )}

        {!loading && error && (
          <div style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 32,
            textAlign: 'center',
          }}>
            <p style={{ color: '#64748b', marginBottom: 16 }}>{error}</p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                padding: '10px 20px',
                background: '#006c67',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: generating ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {generating ? 'Generating…' : 'Generate Report'}
            </button>
          </div>
        )}

        {!loading && report && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Summary */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px' }}>
              <p style={{ margin: 0, color: '#1e293b', lineHeight: 1.7, fontSize: 15 }}>{report.summary}</p>
              {report.sessionDurationMins && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#94a3b8' }}>
                  Duration: {report.sessionDurationMins} minutes ·{' '}
                  Generated {new Date(report.generatedAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                </p>
              )}
            </div>

            {/* Topics */}
            {report.topicsCovered.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <CheckCircle size={16} color="#006c67" />
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Topics Covered</h3>
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#475569', fontSize: 14, lineHeight: 2.2 }}>
                  {report.topicsCovered.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            )}

            {/* Struggles */}
            {report.studentStrugglePoints.length > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <AlertTriangle size={16} color="#d97706" />
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#92400e' }}>Areas to Revisit</h3>
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#78350f', fontSize: 14, lineHeight: 2.2 }}>
                  {report.studentStrugglePoints.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            {/* Homework */}
            {report.homeworkSet && (
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <BookOpen size={16} color="#7c3aed" />
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#5b21b6' }}>Homework Set</h3>
                </div>
                <p style={{ margin: 0, color: '#4c1d95', fontSize: 14, lineHeight: 1.6 }}>{report.homeworkSet}</p>
              </div>
            )}

            {/* Next Steps */}
            {report.recommendedNextSteps.length > 0 && (
              <div style={{ background: '#f0faf9', border: '1px solid #a7f3d0', borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <ArrowRight size={16} color="#006c67" />
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#065f46' }}>Recommended Next Steps</h3>
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#064e3b', fontSize: 14, lineHeight: 2.2 }}>
                  {report.recommendedNextSteps.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            {/* Regenerate */}
            <div style={{ textAlign: 'right', paddingTop: 8 }}>
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: '1px solid #e2e8f0',
                  borderRadius: 7,
                  cursor: generating ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  color: '#64748b',
                }}
              >
                {generating ? 'Regenerating…' : 'Regenerate Report'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
