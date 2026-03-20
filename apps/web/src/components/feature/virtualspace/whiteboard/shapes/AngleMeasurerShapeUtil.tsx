/**
 * AngleMeasurerShapeUtil
 * Shows two adjustable arms from a vertex with the angle between them displayed.
 * Double-click to adjust angles.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useEffect, useRef, useCallback } from 'react';

export type AngleMeasurerShape = TLBaseShape<
  'angle-measurer',
  {
    w: number;
    h: number;
    angle1: number; // first arm angle in degrees (0 = right)
    angle2: number; // second arm angle in degrees
    color: string;
    armLength: number;
  }
>;

function AngleMeasurerSvg({ shape }: { shape: AngleMeasurerShape }) {
  const { w, h, angle1, angle2, color, armLength } = shape.props;

  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(armLength, Math.min(w, h) / 2 - 10);

  const toRad = (d: number) => (d * Math.PI) / 180;

  const arm1x = cx + r * Math.cos(toRad(angle1));
  const arm1y = cy - r * Math.sin(toRad(angle1));
  const arm2x = cx + r * Math.cos(toRad(angle2));
  const arm2y = cy - r * Math.sin(toRad(angle2));

  // Arc showing the angle between the two arms
  let startAngle = angle2;
  let endAngle = angle1;
  if (startAngle > endAngle) [startAngle, endAngle] = [endAngle, startAngle];
  let angleDiff = endAngle - startAngle;
  if (angleDiff > 180) angleDiff = 360 - angleDiff;

  const arcR = r * 0.3;
  const midAngle = ((angle1 + angle2) / 2) * (Math.PI / 180);
  const arcStartRad = toRad(Math.min(angle1, angle2));
  const arcEndRad = toRad(Math.max(angle1, angle2));

  const arcX1 = cx + arcR * Math.cos(arcStartRad);
  const arcY1 = cy - arcR * Math.sin(arcStartRad);
  const arcX2 = cx + arcR * Math.cos(arcEndRad);
  const arcY2 = cy - arcR * Math.sin(arcEndRad);

  const diff = Math.abs(angle1 - angle2) % 360;
  const displayAngle = diff > 180 ? 360 - diff : diff;
  const largeArc = displayAngle > 180 ? 1 : 0;

  const labelX = cx + (arcR + 16) * Math.cos(midAngle);
  const labelY = cy - (arcR + 16) * Math.sin(midAngle);

  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {/* Arc */}
      <path
        d={`M ${arcX1} ${arcY1} A ${arcR} ${arcR} 0 ${largeArc} 1 ${arcX2} ${arcY2}`}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        opacity={0.6}
      />

      {/* Arm 1 */}
      <line x1={cx} y1={cy} x2={arm1x} y2={arm1y} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <circle cx={arm1x} cy={arm1y} r={4} fill={color} />

      {/* Arm 2 */}
      <line x1={cx} y1={cy} x2={arm2x} y2={arm2y} stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />
      <circle cx={arm2x} cy={arm2y} r={4} fill="#ef4444" />

      {/* Vertex */}
      <circle cx={cx} cy={cy} r={4} fill={color} />

      {/* Angle label */}
      <text x={labelX} y={labelY} textAnchor="middle" fontSize={12} fill={color} fontFamily="sans-serif" fontWeight={700}>
        {displayAngle.toFixed(1)}°
      </text>
    </svg>
  );
}

function AngleMeasurerEditor({ shape, onClose }: { shape: AngleMeasurerShape; onClose: () => void }) {
  const editor = useEditor();
  const [angle1, setAngle1] = useState(shape.props.angle1);
  const [angle2, setAngle2] = useState(shape.props.angle2);
  const [color, setColor] = useState(shape.props.color);
  const [armLength, setArmLength] = useState(shape.props.armLength);
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

  const diff = Math.abs(angle1 - angle2) % 360;
  const displayAngle = diff > 180 ? 360 - diff : diff;

  const apply = useCallback(() => {
    (editor as any).updateShape({
      id: shape.id,
      type: 'angle-measurer',
      props: { angle1: Number(angle1), angle2: Number(angle2), color, armLength: Number(armLength) },
    });
    onClose();
  }, [editor, shape.id, angle1, angle2, color, armLength, onClose]);

  return (
    <div
      ref={popupRef}
      style={{ position: 'absolute', top: 0, left: '100%', marginLeft: 8, zIndex: 100, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, width: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', pointerEvents: 'all' }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4, color: '#7c3aed' }}>Angle Measurer</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', marginBottom: 10, textAlign: 'center' }}>{displayAngle.toFixed(1)}°</div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 2 }}>Arm 1: {angle1}°</div>
        <input type="range" min={0} max={360} value={angle1} onChange={(e) => setAngle1(Number(e.target.value))} style={{ width: '100%' }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 2, color: '#ef4444' }}>Arm 2: {angle2}°</div>
        <input type="range" min={0} max={360} value={angle2} onChange={(e) => setAngle2(Number(e.target.value))} style={{ width: '100%' }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 2 }}>Arm length: {armLength}px</div>
        <input type="range" min={40} max={150} value={armLength} onChange={(e) => setArmLength(Number(e.target.value))} style={{ width: '100%' }} />
      </div>
      <label style={{ fontSize: 11, display: 'flex', gap: 4, alignItems: 'center', marginBottom: 10 }}>
        Color:&nbsp;<input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 32, height: 22, border: 'none', cursor: 'pointer' }} />
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={apply} style={{ flex: 1, background: '#7c3aed', color: 'white', border: 'none', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Apply</button>
        <button onClick={onClose} style={{ flex: 1, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function AngleMeasurerComponent({ shape }: { shape: AngleMeasurerShape }) {
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
        <AngleMeasurerSvg shape={shape} />
        {isEditing && <AngleMeasurerEditor shape={shape} onClose={() => editor.setEditingShape(null)} />}
      </div>
    </HTMLContainer>
  );
}

export class AngleMeasurerShapeUtil extends ShapeUtil<any> {
  static override type = 'angle-measurer' as const;

  static override props = {
    w: T.number,
    h: T.number,
    angle1: T.number,
    angle2: T.number,
    color: T.string,
    armLength: T.number,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): AngleMeasurerShape['props'] {
    return { w: 240, h: 240, angle1: 30, angle2: 100, color: '#7c3aed', armLength: 100 };
  }

  getGeometry(shape: AngleMeasurerShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: AngleMeasurerShape) {
    return <AngleMeasurerComponent shape={shape} />;
  }

  indicator(shape: AngleMeasurerShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
