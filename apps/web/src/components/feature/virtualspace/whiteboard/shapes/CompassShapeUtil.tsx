/**
 * CompassShapeUtil
 * A drawing compass shape showing a circle with adjustable radius.
 * Double-click to set radius.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useEffect, useRef, useCallback } from 'react';

export type CompassShape = TLBaseShape<
  'compass',
  { w: number; h: number; radius: number; color: string; showRadius: boolean }
>;

function CompassSvg({ shape }: { shape: CompassShape }) {
  const { w, h, radius, color, showRadius } = shape.props;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(radius, Math.min(w, h) / 2 - 8);

  // Compass pivot point at top-right
  const pivotX = cx + r * Math.cos(-Math.PI / 6);
  const pivotY = cy + r * Math.sin(-Math.PI / 6);

  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {/* Circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={1.8} strokeDasharray="4 2" />

      {/* Centre dot */}
      <circle cx={cx} cy={cy} r={3} fill={color} />

      {/* Compass legs (decorative) */}
      <line x1={cx} y1={cy} x2={pivotX} y2={pivotY} stroke={color} strokeWidth={1.2} />
      <line x1={cx} y1={cy} x2={cx - r * 0.35} y2={cy - r * 0.8} stroke={color} strokeWidth={1.2} />

      {/* Radius label */}
      {showRadius && (
        <>
          <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke={color} strokeWidth={0.8} strokeDasharray="3 2" opacity={0.5} />
          <text
            x={cx + r / 2}
            y={cy - 6}
            textAnchor="middle"
            fontSize={10}
            fill={color}
            fontFamily="sans-serif"
            fontWeight={600}
          >
            r = {radius}px
          </text>
        </>
      )}
    </svg>
  );
}

function CompassEditor({ shape, onClose }: { shape: CompassShape; onClose: () => void }) {
  const editor = useEditor();
  const [radius, setRadius] = useState(shape.props.radius);
  const [color, setColor] = useState(shape.props.color);
  const [showRadius, setShowRadius] = useState(shape.props.showRadius);
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
    (editor as any).updateShape({ id: shape.id, type: 'compass', props: { radius: Number(radius), color, showRadius } });
    onClose();
  }, [editor, shape.id, radius, color, showRadius, onClose]);

  return (
    <div
      ref={popupRef}
      style={{ position: 'absolute', top: 0, left: '100%', marginLeft: 8, zIndex: 100, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, width: 180, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', pointerEvents: 'all' }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: '#0369a1' }}>Compass</div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 2 }}>Radius: {radius}px</div>
        <input type="range" min={20} max={200} value={radius} onChange={(e) => setRadius(Number(e.target.value))} style={{ width: '100%' }} />
      </div>
      <label style={{ fontSize: 11, display: 'flex', gap: 4, alignItems: 'center', marginBottom: 8 }}>
        Color:&nbsp;<input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 32, height: 22, border: 'none', cursor: 'pointer' }} />
      </label>
      <label style={{ fontSize: 11, display: 'flex', gap: 4, marginBottom: 10 }}>
        <input type="checkbox" checked={showRadius} onChange={(e) => setShowRadius(e.target.checked)} />
        Show radius
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={apply} style={{ flex: 1, background: '#0369a1', color: 'white', border: 'none', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Apply</button>
        <button onClick={onClose} style={{ flex: 1, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function CompassComponent({ shape }: { shape: CompassShape }) {
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
        <CompassSvg shape={shape} />
        {isEditing && <CompassEditor shape={shape} onClose={() => editor.setEditingShape(null)} />}
      </div>
    </HTMLContainer>
  );
}

export class CompassShapeUtil extends ShapeUtil<any> {
  static override type = 'compass' as const;

  static override props = {
    w: T.number,
    h: T.number,
    radius: T.number,
    color: T.string,
    showRadius: T.boolean,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): CompassShape['props'] {
    return { w: 240, h: 240, radius: 100, color: '#0369a1', showRadius: true };
  }

  getGeometry(shape: CompassShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: CompassShape) {
    return <CompassComponent shape={shape} />;
  }

  indicator(shape: CompassShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
