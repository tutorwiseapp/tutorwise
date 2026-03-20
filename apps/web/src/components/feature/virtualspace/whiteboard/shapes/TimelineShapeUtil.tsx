/**
 * TimelineShapeUtil
 * Horizontal timeline with up to 10 events. Events alternate above/below the line.
 * Double-click to edit events (label, date, colour).
 * Useful for History, English (plot structure), Science (discoveries).
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useEffect, useRef, useCallback } from 'react';

interface TimelineEvent {
  label: string;
  date: string;
  color: string;
  above: boolean; // alternates automatically, but can be overridden
}

export type TimelineShape = TLBaseShape<
  'timeline',
  {
    w: number;
    h: number;
    events: string; // JSON TimelineEvent[]
    title: string;
    lineColor: string;
  }
>;

const DEFAULT_EVENTS: TimelineEvent[] = [
  { label: 'Event 1', date: '1066', color: '#2563eb', above: true },
  { label: 'Event 2', date: '1215', color: '#dc2626', above: false },
  { label: 'Event 3', date: '1348', color: '#16a34a', above: true },
  { label: 'Event 4', date: '1492', color: '#d97706', above: false },
];

const EVENT_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#64748b', '#ea580c', '#65a30d'];

function TimelineSvg({ shape }: { shape: TimelineShape }) {
  const { w, h, lineColor, title } = shape.props;
  const events: TimelineEvent[] = (() => { try { return JSON.parse(shape.props.events); } catch { return DEFAULT_EVENTS; } })();

  const padH = 24;
  const lineY = h / 2 + (title ? 8 : 0);
  const armLen = (h / 2 - 20) * 0.7;

  const xs = events.map((_, i) => padH + (i / Math.max(events.length - 1, 1)) * (w - padH * 2));

  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {title && (
        <text x={w / 2} y={14} textAnchor="middle" fontSize={12} fontWeight={700} fill="#1e293b" fontFamily="sans-serif">{title}</text>
      )}

      {/* Main line */}
      <line x1={padH - 8} y1={lineY} x2={w - padH + 8} y2={lineY} stroke={lineColor} strokeWidth={2.5} strokeLinecap="round" />

      {/* Arrow heads */}
      <polygon points={`${w - padH + 8},${lineY} ${w - padH},${lineY - 4} ${w - padH},${lineY + 4}`} fill={lineColor} />

      {events.map((ev, i) => {
        const x = xs[i];
        const isAbove = ev.above !== undefined ? ev.above : i % 2 === 0;
        const dy = isAbove ? -armLen : armLen;
        const textY = lineY + dy + (isAbove ? -4 : 14);
        const dateY = lineY + dy + (isAbove ? -16 : 26);

        return (
          <g key={i}>
            {/* Arm */}
            <line x1={x} y1={lineY} x2={x} y2={lineY + dy * 0.85} stroke={ev.color} strokeWidth={1.5} />
            {/* Dot */}
            <circle cx={x} cy={lineY} r={6} fill={ev.color} stroke="white" strokeWidth={2} />
            {/* Label */}
            <text x={x} y={textY} textAnchor="middle" fontSize={10} fontWeight={700} fill={ev.color} fontFamily="sans-serif">{ev.label}</text>
            {/* Date */}
            <text x={x} y={dateY} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="sans-serif">{ev.date}</text>
          </g>
        );
      })}
    </svg>
  );
}

function TimelineEditor({ shape, onClose }: { shape: TimelineShape; onClose: () => void }) {
  const editor = useEditor();
  const [title, setTitle] = useState(shape.props.title);
  const [events, setEvents] = useState<TimelineEvent[]>(() => { try { return JSON.parse(shape.props.events); } catch { return DEFAULT_EVENTS; } });
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = popupRef.current;
    if (!el) return;
    const stop = (e: PointerEvent) => e.stopPropagation();
    el.addEventListener('pointerdown', stop, false);
    el.addEventListener('pointermove', stop, false);
    el.addEventListener('pointerup', stop, false);
    return () => {
      el.removeEventListener('pointerdown', stop, false);
      el.removeEventListener('pointermove', stop, false);
      el.removeEventListener('pointerup', stop, false);
    };
  }, []);

  const apply = useCallback(() => {
    const normalized = events.map((ev, i) => ({ ...ev, above: i % 2 === 0 }));
    (editor as any).updateShape({
      id: shape.id,
      type: 'timeline',
      props: { title, events: JSON.stringify(normalized) },
    });
    onClose();
  }, [editor, shape.id, title, events, onClose]);

  return (
    <div ref={popupRef} style={{ position: 'absolute', top: 0, left: '100%', marginLeft: 8, zIndex: 100, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, width: 240, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', pointerEvents: 'all', maxHeight: 440, overflowY: 'auto' }}
      onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: '#d97706' }}>Timeline</div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Timeline title..." style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 12, marginBottom: 8, boxSizing: 'border-box' }} />
      <div style={{ marginBottom: 8 }}>
        {events.map((ev, i) => (
          <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
            <input type="color" value={ev.color} onChange={(e) => setEvents((prev) => prev.map((b, j) => j === i ? { ...b, color: e.target.value } : b))} style={{ width: 22, height: 22, border: 'none', cursor: 'pointer', borderRadius: 3 }} />
            <input value={ev.date} onChange={(e) => setEvents((prev) => prev.map((b, j) => j === i ? { ...b, date: e.target.value } : b))} placeholder="Date" style={{ width: 52, border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 4px', fontSize: 11 }} />
            <input value={ev.label} onChange={(e) => setEvents((prev) => prev.map((b, j) => j === i ? { ...b, label: e.target.value } : b))} placeholder="Label" style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 4px', fontSize: 11 }} />
            <button onClick={() => setEvents((prev) => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}>×</button>
          </div>
        ))}
        {events.length < 10 && (
          <button onClick={() => setEvents((prev) => [...prev, { label: `Event ${prev.length + 1}`, date: '', color: EVENT_COLORS[prev.length % EVENT_COLORS.length], above: prev.length % 2 === 0 }])} style={{ fontSize: 11, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', width: '100%' }}>+ Add event</button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={apply} style={{ flex: 1, background: '#d97706', color: 'white', border: 'none', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Apply</button>
        <button onClick={onClose} style={{ flex: 1, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function TimelineComponent({ shape }: { shape: TimelineShape }) {
  const editor = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(() => editor.getEditingShapeId() === shape.id);
  useEffect(() => {
    return editor.store.listen(() => setIsEditing(editor.getEditingShapeId() === shape.id));
  }, [editor, shape.id]);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isEditing) return;
    const stop = (e: PointerEvent) => e.stopPropagation();
    el.addEventListener('pointerdown', stop, false);
    el.addEventListener('pointermove', stop, false);
    el.addEventListener('pointerup', stop, false);
    return () => {
      el.removeEventListener('pointerdown', stop, false);
      el.removeEventListener('pointermove', stop, false);
      el.removeEventListener('pointerup', stop, false);
    };
  }, [isEditing]);
  return (
    <HTMLContainer>
      <div ref={containerRef} style={{ position: 'relative', width: shape.props.w, height: shape.props.h, userSelect: 'none' }}>
        <TimelineSvg shape={shape} />
        {isEditing && <TimelineEditor shape={shape} onClose={() => editor.setEditingShape(null)} />}
      </div>
    </HTMLContainer>
  );
}

export class TimelineShapeUtil extends ShapeUtil<any> {
  static override type = 'timeline' as const;

  static override props = {
    w: T.number,
    h: T.number,
    events: T.string,
    title: T.string,
    lineColor: T.string,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): TimelineShape['props'] {
    return { w: 480, h: 160, events: JSON.stringify(DEFAULT_EVENTS), title: '', lineColor: '#475569' };
  }

  getGeometry(shape: TimelineShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: TimelineShape) {
    return <TimelineComponent shape={shape} />;
  }

  indicator(shape: TimelineShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
