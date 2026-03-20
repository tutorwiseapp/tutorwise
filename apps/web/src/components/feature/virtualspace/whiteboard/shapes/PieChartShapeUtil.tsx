/**
 * PieChartShapeUtil
 * Fully editable pie chart — up to 8 segments with labels and percentages.
 * Double-click to add/edit segments.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useCallback } from 'react';

interface Segment {
  label: string;
  value: number;
  color: string;
}

export type PieChartShape = TLBaseShape<
  'pie-chart',
  {
    w: number;
    h: number;
    segments: string; // JSON array of Segment
    title: string;
    showLabels: boolean;
    showPercentages: boolean;
  }
>;

const DEFAULT_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#64748b'];

const DEFAULT_SEGMENTS: Segment[] = [
  { label: 'A', value: 35, color: '#2563eb' },
  { label: 'B', value: 25, color: '#dc2626' },
  { label: 'C', value: 20, color: '#16a34a' },
  { label: 'D', value: 20, color: '#d97706' },
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function PieChartSvg({ shape }: { shape: PieChartShape }) {
  const { w, h, title, showLabels, showPercentages } = shape.props;
  const segments: Segment[] = (() => {
    try { return JSON.parse(shape.props.segments); } catch { return DEFAULT_SEGMENTS; }
  })();

  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const cx = w / 2;
  const cy = title ? h / 2 + 10 : h / 2;
  const r = Math.min(cx - 8, cy - 8) - (showLabels ? 24 : 4);

  let currentAngle = 0;

  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {title && (
        <text x={cx} y={16} textAnchor="middle" fontSize={13} fontWeight={700} fill="#1e293b" fontFamily="sans-serif">
          {title}
        </text>
      )}
      {segments.map((seg, i) => {
        const pct = total > 0 ? (seg.value / total) * 360 : 0;
        const path = describeArc(cx, cy, r, currentAngle, currentAngle + pct);
        const midAngle = currentAngle + pct / 2;
        const labelR = r * 0.65;
        const labelPos = polarToCartesian(cx, cy, labelR, midAngle - 90 + 90);
        const outerR = r + 16;
        const outerPos = polarToCartesian(cx, cy, outerR, midAngle - 90 + 90);
        const pctStr = `${((seg.value / total) * 100).toFixed(1)}%`;
        currentAngle += pct;

        return (
          <g key={i}>
            <path d={path} fill={seg.color} stroke="white" strokeWidth={2} />
            {showLabels && (
              <>
                <text x={labelPos.x} y={labelPos.y + 4} textAnchor="middle" fontSize={11} fill="white" fontWeight={700} fontFamily="sans-serif">
                  {seg.label}
                </text>
                {showPercentages && (
                  <text x={outerPos.x} y={outerPos.y + 4} textAnchor="middle" fontSize={10} fill={seg.color} fontWeight={600} fontFamily="sans-serif">
                    {pctStr}
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function PieEditor({ shape, onClose }: { shape: PieChartShape; onClose: () => void }) {
  const editor = useEditor();
  const [title, setTitle] = useState(shape.props.title);
  const [showLabels, setShowLabels] = useState(shape.props.showLabels);
  const [showPercentages, setShowPercentages] = useState(shape.props.showPercentages);
  const [segments, setSegments] = useState<Segment[]>(() => {
    try { return JSON.parse(shape.props.segments); } catch { return DEFAULT_SEGMENTS; }
  });

  const apply = useCallback(() => {
    (editor as any).updateShape({
      id: shape.id,
      type: 'pie-chart',
      props: { title, showLabels, showPercentages, segments: JSON.stringify(segments) },
    });
    onClose();
  }, [editor, shape.id, title, showLabels, showPercentages, segments, onClose]);

  const addSegment = () => {
    if (segments.length >= 8) return;
    setSegments((prev) => [...prev, { label: `Seg ${prev.length + 1}`, value: 10, color: DEFAULT_COLORS[prev.length % DEFAULT_COLORS.length] }]);
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: '100%', marginLeft: 8, zIndex: 100, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, width: 220, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', pointerEvents: 'all', maxHeight: 400, overflowY: 'auto' }}
      onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: '#2563eb' }}>Pie Chart</div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chart title..." style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 12, marginBottom: 8, boxSizing: 'border-box' }} />
      <div style={{ marginBottom: 8 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
            <input type="color" value={seg.color} onChange={(e) => setSegments((prev) => prev.map((s, j) => j === i ? { ...s, color: e.target.value } : s))} style={{ width: 24, height: 24, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
            <input value={seg.label} onChange={(e) => setSegments((prev) => prev.map((s, j) => j === i ? { ...s, label: e.target.value } : s))} style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 4px', fontSize: 11 }} />
            <input type="number" min={1} value={seg.value} onChange={(e) => setSegments((prev) => prev.map((s, j) => j === i ? { ...s, value: Number(e.target.value) } : s))} style={{ width: 44, border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 4px', fontSize: 11 }} />
            <button onClick={() => setSegments((prev) => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, lineHeight: 1 }}>×</button>
          </div>
        ))}
        {segments.length < 8 && (
          <button onClick={addSegment} style={{ fontSize: 11, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', width: '100%' }}>+ Add segment</button>
        )}
      </div>
      <label style={{ fontSize: 11, display: 'flex', gap: 4, marginBottom: 4 }}>
        <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} /> Show labels
      </label>
      <label style={{ fontSize: 11, display: 'flex', gap: 4, marginBottom: 10 }}>
        <input type="checkbox" checked={showPercentages} onChange={(e) => setShowPercentages(e.target.checked)} /> Show percentages
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={apply} style={{ flex: 1, background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Apply</button>
        <button onClick={onClose} style={{ flex: 1, background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function PieChartComponent({ shape }: { shape: PieChartShape }) {
  const editor = useEditor();
  const isEditing = editor.getEditingShapeId() === shape.id;
  return (
    <HTMLContainer>
      <div style={{ position: 'relative', width: shape.props.w, height: shape.props.h, userSelect: 'none' }}>
        <PieChartSvg shape={shape} />
        {isEditing && <PieEditor shape={shape} onClose={() => editor.setEditingShape(null)} />}
      </div>
    </HTMLContainer>
  );
}

export class PieChartShapeUtil extends ShapeUtil<PieChartShape> {
  static override type = 'pie-chart' as const;

  static override props = {
    w: T.number,
    h: T.number,
    segments: T.string,
    title: T.string,
    showLabels: T.boolean,
    showPercentages: T.boolean,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): PieChartShape['props'] {
    return { w: 240, h: 240, segments: JSON.stringify(DEFAULT_SEGMENTS), title: '', showLabels: true, showPercentages: true };
  }

  getGeometry(shape: PieChartShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: PieChartShape) {
    return <PieChartComponent shape={shape} />;
  }

  indicator(shape: PieChartShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
