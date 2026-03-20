/**
 * FractionBarShapeUtil
 * Visual fraction bars — shows numerator/denominator as coloured segments.
 * Supports whole number, mixed number, and fraction notation.
 * Can show two fractions side-by-side for comparison.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useCallback } from 'react';

export type FractionBarShape = TLBaseShape<
  'fraction-bar',
  {
    w: number;
    h: number;
    numerator: number;
    denominator: number;
    showLabel: boolean;
    color: string;
    bgColor: string;
    label: string;
    showEquivalent: boolean;
    eqNumerator: number;
    eqDenominator: number;
  }
>;

function FractionBarSvg({ shape }: { shape: FractionBarShape }) {
  const { w, h, numerator, denominator, showLabel, color, bgColor, label, showEquivalent, eqNumerator, eqDenominator } = shape.props;

  const denom = Math.max(1, denominator);
  const num = Math.max(0, Math.min(numerator, denom * 10));

  const barHeight = showEquivalent ? (h - (showLabel ? 36 : 8)) / 2 - 4 : h - (showLabel ? 40 : 12);
  const barY1 = showLabel ? 32 : 8;
  const barY2 = barY1 + barHeight + 8;

  const barW = w - 16;
  const segW = barW / denom;

  const renderBar = (n: number, d: number, y: number, fillColor: string, bColor: string, rowLabel?: string) => {
    const sd = Math.max(1, d);
    const sn = Math.max(0, Math.min(n, sd * 10));
    const sw = barW / sd;
    const fullBlocks = Math.floor(sn / sd);
    const remainder = sn % sd;

    return (
      <g>
        {rowLabel && (
          <text x={8} y={y - 5} fontSize={10} fill="#475569" fontFamily="sans-serif" fontWeight={500}>
            {rowLabel}
          </text>
        )}
        {/* Whole blocks */}
        {Array.from({ length: fullBlocks }).map((_, bi) => (
          <rect key={`wb${bi}`} x={8 + bi * barW} y={y} width={barW} height={barHeight}
            fill={fillColor} stroke="white" strokeWidth={0.5} rx={2} />
        ))}
        {/* Remainder segments */}
        {Array.from({ length: sd }).map((_, i) => (
          <rect key={`seg${i}`} x={8 + fullBlocks * barW + i * sw} y={y}
            width={sw} height={barHeight}
            fill={i < remainder ? fillColor : bColor}
            stroke="white" strokeWidth={1}
            rx={i === 0 ? 2 : 0}
          />
        ))}
        {/* Segment borders */}
        {Array.from({ length: sd + 1 }).map((_, i) => (
          <line key={`sl${i}`} x1={8 + fullBlocks * barW + i * sw} y1={y}
            x2={8 + fullBlocks * barW + i * sw} y2={y + barHeight}
            stroke="#64748b" strokeWidth={0.5} />
        ))}
        {/* Outer border */}
        <rect x={8} y={y} width={(fullBlocks + 1) * barW} height={barHeight}
          fill="none" stroke="#64748b" strokeWidth={1.2} rx={2} />
      </g>
    );
  };

  const formatFraction = (n: number, d: number) => {
    const sd = Math.max(1, d);
    const sn = Math.max(0, n);
    const whole = Math.floor(sn / sd);
    const rem = sn % sd;
    if (whole > 0 && rem > 0) return `${whole} ${rem}/${sd}`;
    if (rem === 0) return whole.toString();
    return `${sn}/${sd}`;
  };

  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {/* Label above */}
      {showLabel && (
        <text x={w / 2} y={14} textAnchor="middle" fontSize={12} fontWeight={600} fill="#1e293b" fontFamily="sans-serif">
          {label || formatFraction(num, denom)}
        </text>
      )}

      {showEquivalent ? (
        <>
          {renderBar(num, denom, barY1, color, bgColor, `${formatFraction(num, denom)}`)}
          {renderBar(eqNumerator, eqDenominator, barY2, '#2563eb', '#dbeafe',
            `${formatFraction(eqNumerator, eqDenominator)}`)}
        </>
      ) : (
        renderBar(num, denom, barY1, color, bgColor)
      )}

      {/* Fraction label below */}
      {showLabel && !showEquivalent && (
        <text x={8 + barW / 2} y={barY1 + barHeight + 14} textAnchor="middle"
          fontSize={11} fill="#475569" fontFamily="sans-serif">
          {formatFraction(num, denom)} = {num}/{denom}
        </text>
      )}
    </svg>
  );
}

function FractionEditor({ shape, onClose }: { shape: FractionBarShape; onClose: () => void }) {
  const editor = useEditor();
  const [vals, setVals] = useState({
    numerator: shape.props.numerator,
    denominator: shape.props.denominator,
    showLabel: shape.props.showLabel,
    label: shape.props.label,
    showEquivalent: shape.props.showEquivalent,
    eqNumerator: shape.props.eqNumerator,
    eqDenominator: shape.props.eqDenominator,
  });

  const apply = useCallback(() => {
    (editor as any).updateShape({
      id: shape.id,
      type: 'fraction-bar',
      props: {
        numerator: Number(vals.numerator),
        denominator: Number(vals.denominator),
        showLabel: vals.showLabel,
        label: vals.label,
        showEquivalent: vals.showEquivalent,
        eqNumerator: Number(vals.eqNumerator),
        eqDenominator: Number(vals.eqDenominator),
      },
    });
    onClose();
  }, [editor, shape.id, vals, onClose]);

  const fieldStyle: React.CSSProperties = {
    border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 6px', fontSize: 12, width: '100%',
  };

  return (
    <div
      style={{ position: 'absolute', top: 0, left: '100%', marginLeft: 8, zIndex: 100, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, width: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', pointerEvents: 'all' }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: '#006c67' }}>Fraction Settings</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500 }}>Numerator</div>
          <input type="number" style={fieldStyle} min={0} value={vals.numerator} onChange={(e) => setVals(v => ({ ...v, numerator: Number(e.target.value) }))} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500 }}>Denominator</div>
          <input type="number" style={fieldStyle} min={1} value={vals.denominator} onChange={(e) => setVals(v => ({ ...v, denominator: Number(e.target.value) }))} />
        </div>
      </div>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 500 }}>Custom label (optional)</div>
        <input type="text" style={fieldStyle} value={vals.label} onChange={(e) => setVals(v => ({ ...v, label: e.target.value }))} />
      </div>
      <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
        <input type="checkbox" checked={vals.showEquivalent} onChange={(e) => setVals(v => ({ ...v, showEquivalent: e.target.checked }))} />
        Show equivalent fraction
      </label>
      {vals.showEquivalent && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8, paddingLeft: 8, borderLeft: '2px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500 }}>Eq. num</div>
            <input type="number" style={fieldStyle} min={0} value={vals.eqNumerator} onChange={(e) => setVals(v => ({ ...v, eqNumerator: Number(e.target.value) }))} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500 }}>Eq. denom</div>
            <input type="number" style={fieldStyle} min={1} value={vals.eqDenominator} onChange={(e) => setVals(v => ({ ...v, eqDenominator: Number(e.target.value) }))} />
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={apply} style={{ flex: 1, background: '#006c67', color: 'white', border: 'none', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Apply</button>
        <button onClick={onClose} style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function FractionBarComponent({ shape }: { shape: FractionBarShape }) {
  const editor = useEditor();
  const isEditing = editor.getEditingShapeId() === shape.id;
  return (
    <HTMLContainer>
      <div style={{ position: 'relative', width: shape.props.w, height: shape.props.h, userSelect: 'none' }}>
        <FractionBarSvg shape={shape} />
        {isEditing && <FractionEditor shape={shape} onClose={() => editor.setEditingShape(null)} />}
      </div>
    </HTMLContainer>
  );
}

export class FractionBarShapeUtil extends ShapeUtil<any> {
  static override type = 'fraction-bar' as const;

  static override props = {
    w: T.number,
    h: T.number,
    numerator: T.number,
    denominator: T.number,
    showLabel: T.boolean,
    color: T.string,
    bgColor: T.string,
    label: T.string,
    showEquivalent: T.boolean,
    eqNumerator: T.number,
    eqDenominator: T.number,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): FractionBarShape['props'] {
    return {
      w: 280,
      h: 72,
      numerator: 3,
      denominator: 4,
      showLabel: true,
      color: '#006c67',
      bgColor: '#e6f0f0',
      label: '',
      showEquivalent: false,
      eqNumerator: 6,
      eqDenominator: 8,
    };
  }

  getGeometry(shape: FractionBarShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: FractionBarShape) {
    return <FractionBarComponent shape={shape} />;
  }

  indicator(shape: FractionBarShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
