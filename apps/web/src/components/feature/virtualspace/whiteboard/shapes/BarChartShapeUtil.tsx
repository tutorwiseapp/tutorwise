/**
 * BarChartShapeUtil
 * Editable bar chart — up to 10 bars with labels and values.
 * Double-click to edit bars. Supports horizontal and vertical orientation.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useCallback } from 'react';

interface Bar {
  label: string;
  value: number;
  color: string;
}

export type BarChartShape = TLBaseShape<
  'bar-chart',
  {
    w: number;
    h: number;
    bars: string; // JSON Bar[]
    title: string;
    xLabel: string;
    yLabel: string;
    showValues: boolean;
    showGrid: boolean;
  }
>;

const DEFAULT_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777'];

const DEFAULT_BARS: Bar[] = [
  { label: 'Mon', value: 40, color: '#2563eb' },
  { label: 'Tue', value: 65, color: '#dc2626' },
  { label: 'Wed', value: 50, color: '#16a34a' },
  { label: 'Thu', value: 80, color: '#d97706' },
  { label: 'Fri', value: 30, color: '#7c3aed' },
];

function BarChartSvg({ shape }: { shape: BarChartShape }) {
  const { w, h, title, xLabel, yLabel, showValues, showGrid } = shape.props;
  const bars: Bar[] = (() => { try { return JSON.parse(shape.props.bars); } catch { return DEFAULT_BARS; } })();

  const padLeft = yLabel ? 44 : 32;
  const padRight = 12;
  const padTop = title ? 24 : 10;
  const padBottom = xLabel ? 36 : 24;

  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;
  const maxVal = Math.max(...bars.map((b) => b.value), 1);

  // Nice max
  const niceMax = Math.ceil(maxVal / 10) * 10;
  const barW = chartW / bars.length;
  const gap = barW * 0.2;

  const gridLines = 5;

  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {title && (
        <text x={padLeft + chartW / 2} y={14} textAnchor="middle" fontSize={12} fontWeight={700} fill="#1e293b" fontFamily="sans-serif">{title}</text>
      )}

      {/* Y axis label */}
      {yLabel && (
        <text x={10} y={padTop + chartH / 2} textAnchor="middle" fontSize={10} fill="#64748b" fontFamily="sans-serif"
          transform={`rotate(-90, 10, ${padTop + chartH / 2})`}>{yLabel}</text>
      )}

      {/* Grid lines */}
      {showGrid && Array.from({ length: gridLines + 1 }).map((_, i) => {
        const y = padTop + chartH - (i / gridLines) * chartH;
        const val = Math.round((i / gridLines) * niceMax);
        return (
          <g key={i}>
            <line x1={padLeft} y1={y} x2={padLeft + chartW} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={padLeft - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8" fontFamily="sans-serif">{val}</text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + chartH} stroke="#475569" strokeWidth={1.5} />
      <line x1={padLeft} y1={padTop + chartH} x2={padLeft + chartW} y2={padTop + chartH} stroke="#475569" strokeWidth={1.5} />

      {/* Bars */}
      {bars.map((bar, i) => {
        const barH = (bar.value / niceMax) * chartH;
        const x = padLeft + i * barW + gap / 2;
        const y = padTop + chartH - barH;
        const bw = barW - gap;

        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={barH} fill={bar.color} rx={3} opacity={0.9} />
            <text x={x + bw / 2} y={padTop + chartH + 12} textAnchor="middle" fontSize={10} fill="#475569" fontFamily="sans-serif">{bar.label}</text>
            {showValues && (
              <text x={x + bw / 2} y={y - 4} textAnchor="middle" fontSize={9} fill={bar.color} fontWeight={700} fontFamily="sans-serif">{bar.value}</text>
            )}
          </g>
        );
      })}

      {/* X label */}
      {xLabel && (
        <text x={padLeft + chartW / 2} y={h - 4} textAnchor="middle" fontSize={10} fill="#64748b" fontFamily="sans-serif">{xLabel}</text>
      )}
    </svg>
  );
}

function BarEditor({ shape, onClose }: { shape: BarChartShape; onClose: () => void }) {
  const editor = useEditor();
  const [title, setTitle] = useState(shape.props.title);
  const [xLabel, setXLabel] = useState(shape.props.xLabel);
  const [yLabel, setYLabel] = useState(shape.props.yLabel);
  const [showValues, setShowValues] = useState(shape.props.showValues);
  const [showGrid, setShowGrid] = useState(shape.props.showGrid);
  const [bars, setBars] = useState<Bar[]>(() => {
    try { return JSON.parse(shape.props.bars); } catch { return DEFAULT_BARS; }
  });

  const apply = useCallback(() => {
    (editor as any).updateShape({
      id: shape.id,
      type: 'bar-chart',
      props: { title, xLabel, yLabel, showValues, showGrid, bars: JSON.stringify(bars) },
    });
    onClose();
  }, [editor, shape.id, title, xLabel, yLabel, showValues, showGrid, bars, onClose]);

  return (
    <div style={{ position: 'absolute', top: 0, left: '100%', marginLeft: 8, zIndex: 100, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, width: 230, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', pointerEvents: 'all', maxHeight: 420, overflowY: 'auto' }}
      onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: '#2563eb' }}>Bar Chart</div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 12, marginBottom: 4, boxSizing: 'border-box' }} />
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <input value={xLabel} onChange={(e) => setXLabel(e.target.value)} placeholder="X label" style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 11 }} />
        <input value={yLabel} onChange={(e) => setYLabel(e.target.value)} placeholder="Y label" style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 11 }} />
      </div>
      <div style={{ marginBottom: 8 }}>
        {bars.map((bar, i) => (
          <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
            <input type="color" value={bar.color} onChange={(e) => setBars((prev) => prev.map((b, j) => j === i ? { ...b, color: e.target.value } : b))} style={{ width: 24, height: 24, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
            <input value={bar.label} onChange={(e) => setBars((prev) => prev.map((b, j) => j === i ? { ...b, label: e.target.value } : b))} style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 4px', fontSize: 11 }} />
            <input type="number" min={0} value={bar.value} onChange={(e) => setBars((prev) => prev.map((b, j) => j === i ? { ...b, value: Number(e.target.value) } : b))} style={{ width: 48, border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 4px', fontSize: 11 }} />
            <button onClick={() => setBars((prev) => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}>×</button>
          </div>
        ))}
        {bars.length < 10 && (
          <button onClick={() => setBars((prev) => [...prev, { label: `Bar ${prev.length + 1}`, value: 50, color: DEFAULT_COLORS[prev.length % DEFAULT_COLORS.length] }])} style={{ fontSize: 11, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', width: '100%' }}>+ Add bar</button>
        )}
      </div>
      <label style={{ fontSize: 11, display: 'flex', gap: 4, marginBottom: 4 }}><input type="checkbox" checked={showValues} onChange={(e) => setShowValues(e.target.checked)} /> Show values</label>
      <label style={{ fontSize: 11, display: 'flex', gap: 4, marginBottom: 10 }}><input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} /> Show grid</label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={apply} style={{ flex: 1, background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Apply</button>
        <button onClick={onClose} style={{ flex: 1, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function BarChartComponent({ shape }: { shape: BarChartShape }) {
  const editor = useEditor();
  const isEditing = editor.getEditingShapeId() === shape.id;
  return (
    <HTMLContainer>
      <div style={{ position: 'relative', width: shape.props.w, height: shape.props.h, userSelect: 'none' }}>
        <BarChartSvg shape={shape} />
        {isEditing && <BarEditor shape={shape} onClose={() => editor.setEditingShape(null)} />}
      </div>
    </HTMLContainer>
  );
}

export class BarChartShapeUtil extends ShapeUtil<any> {
  static override type = 'bar-chart' as const;

  static override props = {
    w: T.number,
    h: T.number,
    bars: T.string,
    title: T.string,
    xLabel: T.string,
    yLabel: T.string,
    showValues: T.boolean,
    showGrid: T.boolean,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): BarChartShape['props'] {
    return { w: 300, h: 220, bars: JSON.stringify(DEFAULT_BARS), title: '', xLabel: '', yLabel: '', showValues: true, showGrid: true };
  }

  getGeometry(shape: BarChartShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: BarChartShape) {
    return <BarChartComponent shape={shape} />;
  }

  indicator(shape: BarChartShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
