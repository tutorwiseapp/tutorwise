/**
 * NumberLineShapeUtil
 * A horizontal number line with configurable range, tick marks, and optional markers.
 * Tutors can place it on the board and double-click to customise.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useCallback } from 'react';

export type NumberLineShape = TLBaseShape<
  'number-line',
  {
    w: number;
    h: number;
    min: number;
    max: number;
    step: number;
    showMinorTicks: boolean;
    minorStep: number;
    markers: number[]; // user-placed highlighted points
    label: string;
    color: string;
    showArrows: boolean;
    showFractions: boolean;
  }
>;

function NumberLineSvg({ shape }: { shape: NumberLineShape }) {
  const { w, h, min, max, step, showMinorTicks, minorStep, markers, label, color, showArrows } = shape.props;

  const padLeft = showArrows ? 24 : 16;
  const padRight = showArrows ? 24 : 16;
  const padTop = label ? 20 : 12;
  const padBottom = 24;
  const lineY = padTop + (h - padTop - padBottom) / 2;
  const lineLen = w - padLeft - padRight;
  const range = max - min;

  const toX = (v: number) => padLeft + ((v - min) / range) * lineLen;

  const majorTicks: number[] = [];
  for (let v = min; v <= max + step * 0.001; v = parseFloat((v + step).toFixed(10))) {
    majorTicks.push(parseFloat(v.toFixed(10)));
  }

  const minorTicks: number[] = [];
  if (showMinorTicks && minorStep < step) {
    for (let v = min; v <= max + minorStep * 0.001; v = parseFloat((v + minorStep).toFixed(10))) {
      const r = v.toFixed(10);
      if (!majorTicks.some(m => m.toFixed(10) === r)) {
        minorTicks.push(parseFloat(r));
      }
    }
  }

  const format = (v: number) => {
    if (Math.abs(v) < 1e-9) return '0';
    // Show fractions hint if very close to a simple fraction
    return parseFloat(v.toPrecision(4)).toString();
  };

  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {/* Label */}
      {label && (
        <text x={w / 2} y={13} textAnchor="middle" fontSize={11} fontWeight={600} fill={color} fontFamily="sans-serif">
          {label}
        </text>
      )}

      {/* Main line */}
      <line x1={padLeft} y1={lineY} x2={padLeft + lineLen} y2={lineY} stroke={color} strokeWidth={2} />

      {/* Arrows */}
      {showArrows && (
        <>
          <polygon points={`${padLeft - 2},${lineY} ${padLeft + 8},${lineY - 4} ${padLeft + 8},${lineY + 4}`} fill={color} />
          <polygon points={`${padLeft + lineLen + 2},${lineY} ${padLeft + lineLen - 8},${lineY - 4} ${padLeft + lineLen - 8},${lineY + 4}`} fill={color} />
        </>
      )}

      {/* Minor ticks */}
      {minorTicks.map((v) => {
        const x = toX(v);
        return <line key={`mt${v}`} x1={x} y1={lineY - 4} x2={x} y2={lineY + 4} stroke={color} strokeWidth={0.8} opacity={0.5} />;
      })}

      {/* Major ticks + labels */}
      {majorTicks.map((v) => {
        const x = toX(v);
        return (
          <g key={`mj${v}`}>
            <line x1={x} y1={lineY - 7} x2={x} y2={lineY + 7} stroke={color} strokeWidth={1.5} />
            <text x={x} y={lineY + 18} textAnchor="middle" fontSize={10} fill={color} fontFamily="sans-serif">
              {format(v)}
            </text>
          </g>
        );
      })}

      {/* User markers (highlighted points) */}
      {markers.map((v, i) => {
        const x = toX(v);
        return (
          <g key={`mk${i}`}>
            <circle cx={x} cy={lineY} r={5} fill="#006c67" stroke="white" strokeWidth={1.5} />
            <text x={x} y={lineY - 10} textAnchor="middle" fontSize={9} fill="#006c67" fontWeight={600} fontFamily="sans-serif">
              {format(v)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function NumberLineEditor({ shape, onClose }: { shape: NumberLineShape; onClose: () => void }) {
  const editor = useEditor();
  const [vals, setVals] = useState({
    min: shape.props.min,
    max: shape.props.max,
    step: shape.props.step,
    minorStep: shape.props.minorStep,
    showMinorTicks: shape.props.showMinorTicks,
    showArrows: shape.props.showArrows,
    label: shape.props.label,
    markersStr: shape.props.markers.join(', '),
  });

  const apply = useCallback(() => {
    const markers = vals.markersStr
      .split(',')
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n));
    (editor as any).updateShape({
      id: shape.id,
      type: 'number-line',
      props: {
        min: Number(vals.min),
        max: Number(vals.max),
        step: Number(vals.step),
        minorStep: Number(vals.minorStep),
        showMinorTicks: vals.showMinorTicks,
        showArrows: vals.showArrows,
        label: vals.label,
        markers,
      },
    });
    onClose();
  }, [editor, shape.id, vals, onClose]);

  const fieldStyle: React.CSSProperties = {
    border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 6px',
    fontSize: 12, width: '100%',
  };

  return (
    <div
      style={{
        position: 'absolute', top: -8, left: 0, zIndex: 100,
        background: 'white', border: '1px solid #e2e8f0', borderRadius: 8,
        padding: 12, width: 220, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        pointerEvents: 'all',
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: '#006c67' }}>Number Line Settings</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
        {[['min', 'Min'], ['max', 'Max'], ['step', 'Major step'], ['minorStep', 'Minor step']].map(([key, label]) => (
          <div key={key}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#374151' }}>{label}</div>
            <input type="number" style={fieldStyle} value={(vals as any)[key]}
              onChange={(e) => setVals(v => ({ ...v, [key]: e.target.value }))} />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#374151' }}>Label</div>
        <input type="text" style={fieldStyle} value={vals.label}
          onChange={(e) => setVals(v => ({ ...v, label: e.target.value }))} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: '#374151' }}>Mark points (comma-separated)</div>
        <input type="text" style={fieldStyle} value={vals.markersStr}
          placeholder="e.g. 0, 0.5, 1"
          onChange={(e) => setVals(v => ({ ...v, markersStr: e.target.value }))} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        {[['showMinorTicks', 'Minor ticks'], ['showArrows', 'Arrows']].map(([key, label]) => (
          <label key={key} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={(vals as any)[key]}
              onChange={(e) => setVals(v => ({ ...v, [key]: e.target.checked }))} />
            {label}
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={apply} style={{ flex: 1, background: '#006c67', color: 'white', border: 'none', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Apply</button>
        <button onClick={onClose} style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function NumberLineComponent({ shape }: { shape: NumberLineShape }) {
  const editor = useEditor();
  const isEditing = editor.getEditingShapeId() === shape.id;
  return (
    <HTMLContainer>
      <div style={{ position: 'relative', width: shape.props.w, height: shape.props.h, userSelect: 'none' }}>
        <NumberLineSvg shape={shape} />
        {isEditing && <NumberLineEditor shape={shape} onClose={() => editor.setEditingShape(null)} />}
      </div>
    </HTMLContainer>
  );
}

export class NumberLineShapeUtil extends ShapeUtil<NumberLineShape> {
  static override type = 'number-line' as const;

  static override props = {
    w: T.number,
    h: T.number,
    min: T.number,
    max: T.number,
    step: T.number,
    showMinorTicks: T.boolean,
    minorStep: T.number,
    markers: T.arrayOf(T.number),
    label: T.string,
    color: T.string,
    showArrows: T.boolean,
    showFractions: T.boolean,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): NumberLineShape['props'] {
    return {
      w: 400,
      h: 72,
      min: -5,
      max: 5,
      step: 1,
      showMinorTicks: true,
      minorStep: 0.5,
      markers: [],
      label: '',
      color: '#1e293b',
      showArrows: true,
      showFractions: false,
    };
  }

  getGeometry(shape: NumberLineShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: NumberLineShape) {
    return <NumberLineComponent shape={shape} />;
  }

  indicator(shape: NumberLineShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
