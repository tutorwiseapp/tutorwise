/**
 * UnitCircleShapeUtil
 * Interactive unit circle with labelled special angles (30°, 45°, 60°, 90°, etc.),
 * (cos θ, sin θ) coordinates, and a draggable angle indicator.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useCallback } from 'react';

export type UnitCircleShape = TLBaseShape<
  'unit-circle',
  {
    w: number;
    h: number;
    angleDeg: number;
    showCoords: boolean;
    showSpecialAngles: boolean;
    showGrid: boolean;
    color: string;
  }
>;

const SPECIAL_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];

const EXACT: Record<number, { cos: string; sin: string }> = {
  0: { cos: '1', sin: '0' },
  30: { cos: '√3/2', sin: '1/2' },
  45: { cos: '√2/2', sin: '√2/2' },
  60: { cos: '1/2', sin: '√3/2' },
  90: { cos: '0', sin: '1' },
  120: { cos: '-1/2', sin: '√3/2' },
  135: { cos: '-√2/2', sin: '√2/2' },
  150: { cos: '-√3/2', sin: '1/2' },
  180: { cos: '-1', sin: '0' },
  210: { cos: '-√3/2', sin: '-1/2' },
  225: { cos: '-√2/2', sin: '-√2/2' },
  240: { cos: '-1/2', sin: '-√3/2' },
  270: { cos: '0', sin: '-1' },
  300: { cos: '1/2', sin: '-√3/2' },
  315: { cos: '√2/2', sin: '-√2/2' },
  330: { cos: '√3/2', sin: '-1/2' },
};

function UnitCircleSvg({ shape }: { shape: UnitCircleShape }) {
  const { w, h, angleDeg, showCoords, showSpecialAngles, showGrid, color } = shape.props;

  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(cx, cy) - 24;

  const rad = (angleDeg * Math.PI) / 180;
  const px = cx + r * Math.cos(rad);
  const py = cy - r * Math.sin(rad);

  const cosVal = Math.cos(rad).toFixed(3);
  const sinVal = Math.sin(rad).toFixed(3);

  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {/* Grid */}
      {showGrid && (
        <>
          <line x1={8} y1={cy} x2={w - 8} y2={cy} stroke="#e2e8f0" strokeWidth={1} />
          <line x1={cx} y1={8} x2={cx} y2={h - 8} stroke="#e2e8f0" strokeWidth={1} />
          {[-1, -0.5, 0.5, 1].map((v) => (
            <g key={v}>
              <line x1={cx + v * r} y1={cy - 4} x2={cx + v * r} y2={cy + 4} stroke="#94a3b8" strokeWidth={0.8} />
              <line x1={cx - 4} y1={cy - v * r} x2={cx + 4} y2={cy - v * r} stroke="#94a3b8" strokeWidth={0.8} />
            </g>
          ))}
        </>
      )}

      {/* Axes */}
      <line x1={8} y1={cy} x2={w - 8} y2={cy} stroke="#475569" strokeWidth={1.2} markerEnd="url(#arr)" />
      <line x1={cx} y1={h - 8} x2={cx} y2={8} stroke="#475569" strokeWidth={1.2} markerEnd="url(#arr)" />

      {/* Axis labels */}
      <text x={w - 6} y={cy + 4} fontSize={11} fill="#475569" fontFamily="sans-serif">x</text>
      <text x={cx + 4} y={10} fontSize={11} fill="#475569" fontFamily="sans-serif">y</text>
      {[-1, 1].map((v) => (
        <g key={v}>
          <text x={cx + v * r + (v > 0 ? 2 : -10)} y={cy + 14} fontSize={9} fill="#64748b" fontFamily="sans-serif">{v}</text>
          <text x={cx + 4} y={cy - v * r + 4} fontSize={9} fill="#64748b" fontFamily="sans-serif">{v}</text>
        </g>
      ))}

      {/* Arrow marker */}
      <defs>
        <marker id="arr" markerWidth={6} markerHeight={6} refX={3} refY={3} orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#475569" />
        </marker>
      </defs>

      {/* Unit circle */}
      <circle cx={cx} cy={cy} r={r} fill="rgba(219,234,254,0.3)" stroke={color} strokeWidth={2} />

      {/* Special angle dots */}
      {showSpecialAngles && SPECIAL_ANGLES.map((deg) => {
        const a = (deg * Math.PI) / 180;
        const sx = cx + r * Math.cos(a);
        const sy = cy - r * Math.sin(a);
        return (
          <circle key={deg} cx={sx} cy={sy} r={3} fill={color} opacity={0.7} />
        );
      })}

      {/* Angle arc */}
      {angleDeg !== 0 && (
        <path
          d={`M ${cx + 20} ${cy} A 20 20 0 ${angleDeg > 180 ? 1 : 0} 1 ${cx + 20 * Math.cos(rad)} ${cy - 20 * Math.sin(rad)}`}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={1.5}
        />
      )}

      {/* Angle line */}
      <line x1={cx} y1={cy} x2={px} y2={py} stroke="#ef4444" strokeWidth={2} strokeLinecap="round" />

      {/* cos/sin projections */}
      <line x1={cx} y1={cy} x2={px} y2={cy} stroke="#2563eb" strokeWidth={1} strokeDasharray="3 3" opacity={0.8} />
      <line x1={px} y1={cy} x2={px} y2={py} stroke="#059669" strokeWidth={1} strokeDasharray="3 3" opacity={0.8} />

      {/* Point */}
      <circle cx={px} cy={py} r={5} fill="#ef4444" />

      {/* Coordinates */}
      {showCoords && (
        <text
          x={px + 8}
          y={py - 8}
          fontSize={10}
          fill="#1e293b"
          fontFamily="sans-serif"
          fontWeight={600}
        >
          ({cosVal}, {sinVal})
        </text>
      )}

      {/* Angle label */}
      <text
        x={cx + 28 * Math.cos(rad / 2)}
        y={cy - 28 * Math.sin(rad / 2) + 4}
        fontSize={10}
        fill="#f59e0b"
        fontWeight={700}
        fontFamily="sans-serif"
      >
        {angleDeg}°
      </text>
    </svg>
  );
}

function UnitCircleEditor({ shape, onClose }: { shape: UnitCircleShape; onClose: () => void }) {
  const editor = useEditor();
  const [vals, setVals] = useState({
    angleDeg: shape.props.angleDeg,
    showCoords: shape.props.showCoords,
    showSpecialAngles: shape.props.showSpecialAngles,
    showGrid: shape.props.showGrid,
  });

  const apply = useCallback(() => {
    (editor as any).updateShape({
      id: shape.id,
      type: 'unit-circle',
      props: { ...vals, angleDeg: Number(vals.angleDeg) },
    });
    onClose();
  }, [editor, shape.id, vals, onClose]);

  const nearest = SPECIAL_ANGLES.reduce((prev, curr) =>
    Math.abs(curr - vals.angleDeg) < Math.abs(prev - vals.angleDeg) ? curr : prev
  );
  const exact = EXACT[nearest];

  return (
    <div
      style={{ position: 'absolute', top: 0, left: '100%', marginLeft: 8, zIndex: 100, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, width: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', pointerEvents: 'all' }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: '#2563eb' }}>Unit Circle</div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 2 }}>Angle: {vals.angleDeg}°</div>
        <input type="range" min={0} max={360} value={vals.angleDeg}
          onChange={(e) => setVals((v) => ({ ...v, angleDeg: Number(e.target.value) }))}
          style={{ width: '100%' }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
          {[0, 30, 45, 60, 90, 120, 135, 150, 180, 270].map((a) => (
            <button key={a} onClick={() => setVals((v) => ({ ...v, angleDeg: a }))}
              style={{ fontSize: 10, padding: '2px 5px', borderRadius: 4, border: '1px solid #e2e8f0', cursor: 'pointer', background: vals.angleDeg === a ? '#2563eb' : 'white', color: vals.angleDeg === a ? 'white' : '#475569' }}>
              {a}°
            </button>
          ))}
        </div>
      </div>
      {exact && (
        <div style={{ background: '#eff6ff', borderRadius: 6, padding: '6px 8px', marginBottom: 8, fontSize: 11 }}>
          <div style={{ color: '#2563eb', fontWeight: 600 }}>cos {nearest}° = {exact.cos}</div>
          <div style={{ color: '#059669', fontWeight: 600 }}>sin {nearest}° = {exact.sin}</div>
        </div>
      )}
      <label style={{ fontSize: 11, display: 'flex', gap: 4, marginBottom: 4 }}>
        <input type="checkbox" checked={vals.showCoords} onChange={(e) => setVals((v) => ({ ...v, showCoords: e.target.checked }))} />
        Show coordinates
      </label>
      <label style={{ fontSize: 11, display: 'flex', gap: 4, marginBottom: 4 }}>
        <input type="checkbox" checked={vals.showSpecialAngles} onChange={(e) => setVals((v) => ({ ...v, showSpecialAngles: e.target.checked }))} />
        Show special angles
      </label>
      <label style={{ fontSize: 11, display: 'flex', gap: 4, marginBottom: 10 }}>
        <input type="checkbox" checked={vals.showGrid} onChange={(e) => setVals((v) => ({ ...v, showGrid: e.target.checked }))} />
        Show grid
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={apply} style={{ flex: 1, background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Apply</button>
        <button onClick={onClose} style={{ flex: 1, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function UnitCircleComponent({ shape }: { shape: UnitCircleShape }) {
  const editor = useEditor();
  const isEditing = editor.getEditingShapeId() === shape.id;
  return (
    <HTMLContainer>
      <div style={{ position: 'relative', width: shape.props.w, height: shape.props.h, userSelect: 'none' }}>
        <UnitCircleSvg shape={shape} />
        {isEditing && <UnitCircleEditor shape={shape} onClose={() => editor.setEditingShape(null)} />}
      </div>
    </HTMLContainer>
  );
}

export class UnitCircleShapeUtil extends ShapeUtil<any> {
  static override type = 'unit-circle' as const;

  static override props = {
    w: T.number,
    h: T.number,
    angleDeg: T.number,
    showCoords: T.boolean,
    showSpecialAngles: T.boolean,
    showGrid: T.boolean,
    color: T.string,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): UnitCircleShape['props'] {
    return { w: 260, h: 260, angleDeg: 45, showCoords: true, showSpecialAngles: true, showGrid: true, color: '#2563eb' };
  }

  getGeometry(shape: UnitCircleShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: UnitCircleShape) {
    return <UnitCircleComponent shape={shape} />;
  }

  indicator(shape: UnitCircleShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
