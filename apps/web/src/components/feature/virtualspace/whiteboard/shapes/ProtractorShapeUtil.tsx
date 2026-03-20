/**
 * ProtractorShapeUtil
 * A semicircle protractor with degree markings (0–180°).
 * Optionally shows an adjustable angle arm.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useCallback } from 'react';

export type ProtractorShape = TLBaseShape<
  'protractor',
  {
    w: number;
    h: number;
    angle: number; // current angle arm in degrees (0–180)
    showArm: boolean;
    showLabels: boolean;
    color: string;
  }
>;

function ProtractorSvg({ shape }: { shape: ProtractorShape }) {
  const { w, h, angle, showArm, showLabels, color } = shape.props;

  const cx = w / 2;
  const cy = h - 10;
  const r = Math.min(w / 2 - 8, h - 20);

  // Major ticks every 10°, minor every 5°
  const ticks = [];
  for (let deg = 0; deg <= 180; deg += 5) {
    const rad = (deg * Math.PI) / 180;
    const isMajor = deg % 10 === 0;
    const tickLen = isMajor ? 12 : 6;
    const x1 = cx + r * Math.cos(Math.PI - rad);
    const y1 = cy - r * Math.sin(rad);
    const x2 = cx + (r - tickLen) * Math.cos(Math.PI - rad);
    const y2 = cy - (r - tickLen) * Math.sin(rad);
    ticks.push({ x1, y1, x2, y2, deg, isMajor });
  }

  // Angle arm
  const armRad = (angle * Math.PI) / 180;
  const armX = cx + r * Math.cos(Math.PI - armRad);
  const armY = cy - r * Math.sin(armRad);

  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {/* Semicircle */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z`}
        fill="rgba(254,252,232,0.7)"
        stroke={color}
        strokeWidth={2}
      />
      {/* Baseline */}
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={color} strokeWidth={1.5} />

      {/* Ticks */}
      {ticks.map(({ x1, y1, x2, y2, deg, isMajor }) => (
        <g key={deg}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={isMajor ? 1.2 : 0.7} />
          {showLabels && isMajor && deg % 30 === 0 && (
            <text
              x={cx + (r - 22) * Math.cos(Math.PI - (deg * Math.PI) / 180)}
              y={cy - (r - 22) * Math.sin((deg * Math.PI) / 180) + 3}
              textAnchor="middle"
              fontSize={9}
              fill={color}
              fontFamily="sans-serif"
            >
              {deg}
            </text>
          )}
        </g>
      ))}

      {/* Centre dot */}
      <circle cx={cx} cy={cy} r={3} fill={color} />

      {/* Angle arm */}
      {showArm && (
        <>
          <line
            x1={cx}
            y1={cy}
            x2={armX}
            y2={armY}
            stroke="#ef4444"
            strokeWidth={2}
            strokeLinecap="round"
          />
          <circle cx={armX} cy={armY} r={4} fill="#ef4444" />
          {/* Angle label */}
          <text
            x={cx + 20 * Math.cos(Math.PI - armRad / 2)}
            y={cy - 20 * Math.sin(armRad / 2) + 4}
            fontSize={11}
            fill="#ef4444"
            fontWeight={700}
            fontFamily="sans-serif"
          >
            {angle}°
          </text>
        </>
      )}
    </svg>
  );
}

function ProtractorEditor({ shape, onClose }: { shape: ProtractorShape; onClose: () => void }) {
  const editor = useEditor();
  const [vals, setVals] = useState({
    angle: shape.props.angle,
    showArm: shape.props.showArm,
    showLabels: shape.props.showLabels,
  });

  const apply = useCallback(() => {
    (editor as any).updateShape({
      id: shape.id,
      type: 'protractor',
      props: { ...vals, angle: Number(vals.angle) },
    });
    onClose();
  }, [editor, shape.id, vals, onClose]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: '100%',
        marginLeft: 8,
        zIndex: 100,
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 12,
        width: 180,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        pointerEvents: 'all',
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: '#7c3aed' }}>Protractor</div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 2 }}>Angle arm: {vals.angle}°</div>
        <input
          type="range"
          min={0}
          max={180}
          value={vals.angle}
          onChange={(e) => setVals((v) => ({ ...v, angle: Number(e.target.value) }))}
          style={{ width: '100%' }}
        />
      </div>
      <label style={{ fontSize: 11, display: 'flex', gap: 4, marginBottom: 6 }}>
        <input type="checkbox" checked={vals.showArm} onChange={(e) => setVals((v) => ({ ...v, showArm: e.target.checked }))} />
        Show angle arm
      </label>
      <label style={{ fontSize: 11, display: 'flex', gap: 4, marginBottom: 10 }}>
        <input type="checkbox" checked={vals.showLabels} onChange={(e) => setVals((v) => ({ ...v, showLabels: e.target.checked }))} />
        Show labels
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={apply} style={{ flex: 1, background: '#7c3aed', color: 'white', border: 'none', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Apply</button>
        <button onClick={onClose} style={{ flex: 1, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function ProtractorComponent({ shape }: { shape: ProtractorShape }) {
  const editor = useEditor();
  const isEditing = editor.getEditingShapeId() === shape.id;
  return (
    <HTMLContainer>
      <div style={{ position: 'relative', width: shape.props.w, height: shape.props.h, userSelect: 'none' }}>
        <ProtractorSvg shape={shape} />
        {isEditing && <ProtractorEditor shape={shape} onClose={() => editor.setEditingShape(null)} />}
      </div>
    </HTMLContainer>
  );
}

export class ProtractorShapeUtil extends ShapeUtil<ProtractorShape> {
  static override type = 'protractor' as const;

  static override props = {
    w: T.number,
    h: T.number,
    angle: T.number,
    showArm: T.boolean,
    showLabels: T.boolean,
    color: T.string,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): ProtractorShape['props'] {
    return { w: 220, h: 130, angle: 45, showArm: true, showLabels: true, color: '#4338ca' };
  }

  getGeometry(shape: ProtractorShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: ProtractorShape) {
    return <ProtractorComponent shape={shape} />;
  }

  indicator(shape: ProtractorShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
