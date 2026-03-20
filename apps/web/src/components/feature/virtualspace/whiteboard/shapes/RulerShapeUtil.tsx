/**
 * RulerShapeUtil
 * A resizable ruler with centimetre and millimetre tick marks.
 * Width maps to length in cm (1px = 1mm by default at 100% zoom).
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useEffect, useRef, useCallback } from 'react';

export type RulerShape = TLBaseShape<
  'ruler',
  { w: number; h: number; color: string; unit: 'cm' | 'in' }
>;

// 1 cm = 37.8 px at 96dpi
const PX_PER_CM = 37.8;
const PX_PER_IN = 96;

function RulerSvg({ shape }: { shape: RulerShape }) {
  const { w, h, color, unit } = shape.props;
  const pxPerUnit = unit === 'cm' ? PX_PER_CM : PX_PER_IN;
  const totalUnits = w / pxPerUnit;
  const majorEvery = unit === 'cm' ? 1 : 1;   // major tick every 1 unit
  const minorEvery = unit === 'cm' ? 0.1 : 1 / 16; // minor tick every 1mm or 1/16in

  const ticks: Array<{ x: number; major: boolean; label?: string }> = [];
  const step = pxPerUnit * minorEvery;
  const count = Math.floor(w / step);

  for (let i = 0; i <= count; i++) {
    const x = i * step;
    const val = i * minorEvery;
    const isMajor = Math.abs(val % majorEvery) < 0.001;
    const label = isMajor && val > 0 && val <= Math.ceil(totalUnits) ? String(Math.round(val)) : undefined;
    ticks.push({ x, major: isMajor, label });
  }

  const tickH = (t: { major: boolean }) => t.major ? h * 0.55 : h * 0.3;

  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {/* Body */}
      <rect x={0} y={0} width={w} height={h} fill="rgba(254,252,232,0.92)" stroke={color} strokeWidth={1.5} rx={3} />
      {/* Ticks */}
      {ticks.map(({ x, major, label }, i) => (
        <g key={i}>
          <line x1={x} y1={h} x2={x} y2={h - tickH({ major })} stroke={color} strokeWidth={major ? 1.2 : 0.6} />
          {label && (
            <text x={x + 2} y={h - tickH({ major }) - 2} fontSize={8} fill={color} fontFamily="sans-serif">{label}</text>
          )}
        </g>
      ))}
      {/* Unit label */}
      <text x={4} y={12} fontSize={9} fill={color} fontFamily="sans-serif" fontWeight={600}>{unit}</text>
    </svg>
  );
}

function RulerEditor({ shape, onClose }: { shape: RulerShape; onClose: () => void }) {
  const editor = useEditor();
  const [unit, setUnit] = useState(shape.props.unit);
  const [color, setColor] = useState(shape.props.color);
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
    (editor as any).updateShape({ id: shape.id, type: 'ruler', props: { unit, color } });
    onClose();
  }, [editor, shape.id, unit, color, onClose]);

  return (
    <div
      ref={popupRef}
      style={{ position: 'absolute', top: 0, left: '100%', marginLeft: 8, zIndex: 100, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, width: 160, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', pointerEvents: 'all' }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: '#2563eb' }}>Ruler</div>
      <label style={{ fontSize: 11, display: 'flex', gap: 4, alignItems: 'center', marginBottom: 8 }}>
        Unit:&nbsp;
        <select value={unit} onChange={(e) => setUnit(e.target.value as 'cm' | 'in')} style={{ fontSize: 11 }}>
          <option value="cm">cm</option>
          <option value="in">in</option>
        </select>
      </label>
      <label style={{ fontSize: 11, display: 'flex', gap: 4, alignItems: 'center', marginBottom: 10 }}>
        Color:&nbsp;
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 32, height: 22, border: 'none', cursor: 'pointer' }} />
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={apply} style={{ flex: 1, background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Apply</button>
        <button onClick={onClose} style={{ flex: 1, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function RulerComponent({ shape }: { shape: RulerShape }) {
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
        <RulerSvg shape={shape} />
        {isEditing && <RulerEditor shape={shape} onClose={() => editor.setEditingShape(null)} />}
      </div>
    </HTMLContainer>
  );
}

export class RulerShapeUtil extends ShapeUtil<any> {
  static override type = 'ruler' as const;

  static override props = {
    w: T.number,
    h: T.number,
    color: T.string,
    unit: T.string,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): RulerShape['props'] {
    return { w: 340, h: 44, color: '#1e293b', unit: 'cm' };
  }

  getGeometry(shape: RulerShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: RulerShape) {
    return <RulerComponent shape={shape} />;
  }

  indicator(shape: RulerShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
