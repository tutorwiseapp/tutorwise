/**
 * HomeworkDialog
 * Tutor sets homework text, published via Ably session channel
 * so the student receives it as a notification.
 * Enhanced: optional Google Classroom posting.
 */

'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, X, Send } from 'lucide-react';

interface GoogleCourse {
  id: string;
  name: string;
  section?: string;
}

interface HomeworkDialogProps {
  onClose: () => void;
  onSend: (text: string, dueDate: string, postToClassroom?: { courseId: string } | null) => void;
}

export function HomeworkDialog({ onClose, onSend }: HomeworkDialogProps) {
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [postToClassroom, setPostToClassroom] = useState(false);
  const [classroomConnected, setClassroomConnected] = useState(false);
  const [courses, setCourses] = useState<GoogleCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  // Check if Google Classroom is connected
  useEffect(() => {
    fetch('/api/integrations/google-classroom/assignments')
      .then((r) => r.json())
      .then((data) => {
        if (data.connected) {
          setClassroomConnected(true);
          setCourses(data.courses || []);
        }
      })
      .catch(() => { /* non-critical */ });
  }, []);

  const handleSend = () => {
    if (!text.trim()) return;
    const classroomOption = postToClassroom && selectedCourseId
      ? { courseId: selectedCourseId }
      : null;
    onSend(text.trim(), dueDate, classroomOption);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          width: 420,
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardList size={18} color="#7c3aed" />
          <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Set Homework</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 2 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Homework text */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
            Homework description
          </label>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Complete exercises 3a–3f from page 42..."
            rows={4}
            style={{
              width: '100%',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '8px 12px',
              fontSize: 13,
              fontFamily: 'system-ui, sans-serif',
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
              color: '#1e293b',
              lineHeight: 1.5,
            }}
            onFocus={(e) => (e.target.style.borderColor = '#7c3aed')}
            onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
          />
        </div>

        {/* Due date */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
            Due date (optional)
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            style={{
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '7px 12px',
              fontSize: 13,
              fontFamily: 'system-ui, sans-serif',
              outline: 'none',
              color: '#1e293b',
            }}
          />
        </div>

        {/* Google Classroom (only shown when connected) */}
        {classroomConnected && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={postToClassroom}
                onChange={(e) => setPostToClassroom(e.target.checked)}
              />
              Also post to Google Classroom
            </label>
            {postToClassroom && courses.length > 0 && (
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                style={{
                  marginTop: 6,
                  width: '100%',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  padding: '7px 10px',
                  fontSize: 13,
                  fontFamily: 'system-ui, sans-serif',
                  color: '#1e293b',
                  outline: 'none',
                }}
              >
                <option value="">— Select a course —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.section ? ` (${c.section})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 16px',
              borderRadius: 7,
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              fontSize: 13,
              cursor: 'pointer',
              color: '#374151',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            style={{
              padding: '7px 16px',
              borderRadius: 7,
              border: 'none',
              background: text.trim() ? '#7c3aed' : '#e5e7eb',
              color: text.trim() ? '#fff' : '#9ca3af',
              fontSize: 13,
              fontWeight: 600,
              cursor: text.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'system-ui, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Send size={14} />
            Send to Student
          </button>
        </div>
      </div>
    </div>
  );
}
