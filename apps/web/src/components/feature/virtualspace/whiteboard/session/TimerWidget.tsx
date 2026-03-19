/**
 * TimerWidget
 * Floating countdown timer overlay for the virtual whiteboard session.
 * Controlled by SessionContext (startTimer / pauseTimer / resetTimer via Ably).
 * Rendered inside InFrontOfTheCanvas.
 */

'use client';

import { useState, useCallback } from 'react';
import { X, Play, Pause, RotateCcw } from 'lucide-react';
import { useSession } from './SessionContext';

const PRESETS = [
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '25 min', seconds: 1500 },
];

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export function TimerWidget() {
  const {
    timerOpen,
    setTimerOpen,
    timerSeconds,
    timerRunning,
    startTimer,
    pauseTimer,
    resetTimer,
  } = useSession();

  const [customMinutes, setCustomMinutes] = useState('');

  const handleCustomStart = useCallback(() => {
    const mins = parseFloat(customMinutes);
    if (!isNaN(mins) && mins > 0) {
      startTimer(Math.round(mins * 60));
      setCustomMinutes('');
    }
  }, [customMinutes, startTimer]);

  if (!timerOpen) return null;

  const isAlmostDone = timerSeconds > 0 && timerSeconds <= 10;
  const isDone = timerSeconds === 0 && !timerRunning;

  return (
    <div
      style={{
        position: 'absolute',
        top: 64,
        right: 16,
        width: 220,
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
        border: `2px solid ${isAlmostDone ? '#ef4444' : '#7c3aed'}`,
        overflow: 'hidden',
        zIndex: 500,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: isAlmostDone ? '#ef4444' : '#7c3aed',
          color: 'white',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600 }}>Timer</span>
        <button
          onClick={() => setTimerOpen(false)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', display: 'flex' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Countdown display */}
      <div
        style={{
          textAlign: 'center',
          padding: '16px 0 12px',
          fontSize: 48,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: isAlmostDone ? '#ef4444' : isDone ? '#94a3b8' : '#1e293b',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          fontFamily: 'ui-monospace, monospace',
          transition: 'color 0.3s',
        }}
      >
        {formatTime(timerSeconds)}
      </div>

      {isDone && timerSeconds === 0 && !timerRunning && (
        <div style={{ textAlign: 'center', fontSize: 12, color: '#7c3aed', fontWeight: 600, marginBottom: 4 }}>
          Time&apos;s up!
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 6, padding: '0 12px 10px' }}>
        {timerRunning ? (
          <button
            onClick={pauseTimer}
            style={btnStyle('#f59e0b')}
          >
            <Pause size={13} /> Pause
          </button>
        ) : (
          <button
            onClick={() => timerSeconds > 0 ? startTimer(timerSeconds) : undefined}
            disabled={timerSeconds === 0}
            style={btnStyle(timerSeconds > 0 ? '#7c3aed' : '#e2e8f0', timerSeconds === 0)}
          >
            <Play size={13} /> Resume
          </button>
        )}
        <button onClick={resetTimer} style={btnStyle('#64748b')}>
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      {/* Presets */}
      <div style={{ borderTop: '1px solid #f1f5f9', padding: '8px 10px' }}>
        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Presets
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {PRESETS.map(({ label, seconds }) => (
            <button
              key={seconds}
              onClick={() => startTimer(seconds)}
              style={{
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 20,
                border: '1px solid #e2e8f0',
                background: 'white',
                cursor: 'pointer',
                color: '#475569',
                fontWeight: 500,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom */}
      <div style={{ borderTop: '1px solid #f1f5f9', padding: '8px 10px 10px' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="number"
            min={0.5}
            step={0.5}
            placeholder="Minutes"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomStart()}
            style={{
              flex: 1,
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 12,
              outline: 'none',
              fontFamily: 'sans-serif',
            }}
          />
          <button
            onClick={handleCustomStart}
            disabled={!customMinutes.trim()}
            style={btnStyle(customMinutes.trim() ? '#7c3aed' : '#e2e8f0', !customMinutes.trim())}
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}

function btnStyle(bg: string, disabled = false): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flex: 1,
    padding: '5px 0',
    borderRadius: 6,
    border: 'none',
    background: bg,
    color: disabled ? '#94a3b8' : 'white',
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'sans-serif',
  };
}
