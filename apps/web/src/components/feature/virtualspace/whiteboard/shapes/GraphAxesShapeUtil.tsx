/**
 * GraphAxesShapeUtil
 * A Cartesian coordinate plane with customisable range, gridlines, and labels.
 * Tutors can drag to resize. Double-click to edit axis settings.
 */

'use client';

import { ShapeUtil, TLBaseShape, T, Rectangle2d, HTMLContainer, useEditor } from '@tldraw/editor';
import { useState, useEffect, useCallback } from 'react';

export type GraphAxesShape = TLBaseShape<
  'graph-axes',
  {
    w: number;
    h: number;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    showGrid: boolean;
    showLabels: boolean;
    gridColor: string;
    axisColor: string;
    labelColor: string;
    title: string;
    xLabel: string;
    yLabel: string;
  }
>;

function GraphAxesSvg({ shape }: { shape: GraphAxesShape }) {
  const { w, h, xMin, xMax, yMin, yMax, showGrid, showLabels, gridColor, axisColor, labelColor, xLabel, yLabel, title } = shape.props;

  const padding = { left: 36, right: 16, top: title ? 28 : 12, bottom: 28 };
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  const xRange = xMax - xMin;
  const yRange = yMax - yMin;

  const toSvgX = (x: number) => padding.left + ((x - xMin) / xRange) * plotW;
  const toSvgY = (y: number) => padding.top + ((yMax - y) / yRange) * plotH;

  // Compute nice tick intervals
  const niceInterval = (range: number, maxTicks: number) => {
    const raw = range / maxTicks;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    let nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return nice * mag;
  };

  const xInterval = niceInterval(xRange, Math.min(10, Math.floor(plotW / 50)));
  const yInterval = niceInterval(yRange, Math.min(8, Math.floor(plotH / 40)));

  const xTicks: number[] = [];
  for (let v = Math.ceil(xMin / xInterval) * xInterval; v <= xMax + 1e-9; v = parseFloat((v + xInterval).toFixed(10))) {
    xTicks.push(parseFloat(v.toFixed(10)));
  }
  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin / yInterval) * yInterval; v <= yMax + 1e-9; v = parseFloat((v + yInterval).toFixed(10))) {
    yTicks.push(parseFloat(v.toFixed(10)));
  }

  const originX = toSvgX(0);
  const originY = toSvgY(0);
  const clampedOriginX = Math.max(padding.left, Math.min(padding.left + plotW, originX));
  const clampedOriginY = Math.max(padding.top, Math.min(padding.top + plotH, originY));

  const formatTick = (v: number) => {
    if (Math.abs(v) < 1e-9) return '0';
    if (Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0)) return v.toExponential(1);
    return parseFloat(v.toPrecision(4)).toString();
  };

  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {/* Background */}
      <rect x={padding.left} y={padding.top} width={plotW} height={plotH} fill="white" stroke={axisColor} strokeWidth={0.5} />

      {/* Title */}
      {title && (
        <text x={w / 2} y={14} textAnchor="middle" fontSize={11} fontWeight={600} fill={labelColor} fontFamily="sans-serif">
          {title}
        </text>
      )}

      {/* Grid lines */}
      {showGrid && xTicks.map((v) => {
        const sx = toSvgX(v);
        if (sx < padding.left - 1 || sx > padding.left + plotW + 1) return null;
        return (
          <line key={`gx${v}`} x1={sx} y1={padding.top} x2={sx} y2={padding.top + plotH}
            stroke={gridColor} strokeWidth={0.8} strokeDasharray="3,3" />
        );
      })}
      {showGrid && yTicks.map((v) => {
        const sy = toSvgY(v);
        if (sy < padding.top - 1 || sy > padding.top + plotH + 1) return null;
        return (
          <line key={`gy${v}`} x1={padding.left} y1={sy} x2={padding.left + plotW} y2={sy}
            stroke={gridColor} strokeWidth={0.8} strokeDasharray="3,3" />
        );
      })}

      {/* X Axis */}
      <line x1={padding.left} y1={clampedOriginY} x2={padding.left + plotW} y2={clampedOriginY}
        stroke={axisColor} strokeWidth={1.5} />
      {/* X arrow */}
      <polygon points={`${padding.left + plotW},${clampedOriginY} ${padding.left + plotW - 6},${clampedOriginY - 4} ${padding.left + plotW - 6},${clampedOriginY + 4}`}
        fill={axisColor} />

      {/* Y Axis */}
      <line x1={clampedOriginX} y1={padding.top} x2={clampedOriginX} y2={padding.top + plotH}
        stroke={axisColor} strokeWidth={1.5} />
      {/* Y arrow */}
      <polygon points={`${clampedOriginX},${padding.top} ${clampedOriginX - 4},${padding.top + 6} ${clampedOriginX + 4},${padding.top + 6}`}
        fill={axisColor} />

      {/* X tick marks and labels */}
      {showLabels && xTicks.map((v) => {
        const sx = toSvgX(v);
        if (sx < padding.left - 1 || sx > padding.left + plotW + 1) return null;
        const showLabel = Math.abs(v) > xInterval * 0.1; // skip 0 label if axis shows it
        return (
          <g key={`tx${v}`}>
            <line x1={sx} y1={clampedOriginY - 3} x2={sx} y2={clampedOriginY + 3} stroke={axisColor} strokeWidth={1} />
            {showLabel && (
              <text x={sx} y={clampedOriginY + 14} textAnchor="middle" fontSize={9} fill={labelColor} fontFamily="sans-serif">
                {formatTick(v)}
              </text>
            )}
          </g>
        );
      })}

      {/* Y tick marks and labels */}
      {showLabels && yTicks.map((v) => {
        const sy = toSvgY(v);
        if (sy < padding.top - 1 || sy > padding.top + plotH + 1) return null;
        const showLabel = Math.abs(v) > yInterval * 0.1;
        return (
          <g key={`ty${v}`}>
            <line x1={clampedOriginX - 3} y1={sy} x2={clampedOriginX + 3} y2={sy} stroke={axisColor} strokeWidth={1} />
            {showLabel && (
              <text x={clampedOriginX - 6} y={sy + 3.5} textAnchor="end" fontSize={9} fill={labelColor} fontFamily="sans-serif">
                {formatTick(v)}
              </text>
            )}
          </g>
        );
      })}

      {/* Axis labels */}
      {xLabel && (
        <text x={padding.left + plotW + 4} y={clampedOriginY + 4} fontSize={10} fontStyle="italic" fill={axisColor} fontFamily="sans-serif">
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text x={clampedOriginX} y={padding.top - 4} textAnchor="middle" fontSize={10} fontStyle="italic" fill={axisColor} fontFamily="sans-serif">
          {yLabel}
        </text>
      )}
    </svg>
  );
}

function GraphAxesEditor({ shape, onClose }: { shape: GraphAxesShape; onClose: () => void }) {
  const editor = useEditor();
  const [vals, setVals] = useState({
    xMin: shape.props.xMin,
    xMax: shape.props.xMax,
    yMin: shape.props.yMin,
    yMax: shape.props.yMax,
    title: shape.props.title,
    xLabel: shape.props.xLabel,
    yLabel: shape.props.yLabel,
    showGrid: shape.props.showGrid,
    showLabels: shape.props.showLabels,
  });

  const apply = useCallback(() => {
    (editor as any).updateShape({
      id: shape.id,
      type: 'graph-axes',
      props: {
        xMin: Number(vals.xMin),
        xMax: Number(vals.xMax),
        yMin: Number(vals.yMin),
        yMax: Number(vals.yMax),
        title: vals.title,
        xLabel: vals.xLabel,
        yLabel: vals.yLabel,
        showGrid: vals.showGrid,
        showLabels: vals.showLabels,
      },
    });
    onClose();
  }, [editor, shape.id, vals, onClose]);

  const fieldStyle: React.CSSProperties = {
    border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 6px',
    fontSize: 12, width: '100%', fontFamily: 'sans-serif',
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: '#374151', fontWeight: 500 };

  return (
    <div
      style={{
        position: 'absolute', top: 8, left: 8, zIndex: 100,
        background: 'white', border: '1px solid #e2e8f0', borderRadius: 8,
        padding: 12, width: 220, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        pointerEvents: 'all',
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: '#006c67' }}>Graph Settings</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        {[['xMin', 'X min'], ['xMax', 'X max'], ['yMin', 'Y min'], ['yMax', 'Y max']].map(([key, label]) => (
          <div key={key}>
            <div style={labelStyle}>{label}</div>
            <input type="number" style={fieldStyle} value={(vals as any)[key]}
              onChange={(e) => setVals(v => ({ ...v, [key]: e.target.value }))} />
          </div>
        ))}
      </div>
      {[['title', 'Title'], ['xLabel', 'x-axis label'], ['yLabel', 'y-axis label']].map(([key, label]) => (
        <div key={key} style={{ marginBottom: 6 }}>
          <div style={labelStyle}>{label}</div>
          <input type="text" style={fieldStyle} value={(vals as any)[key]}
            onChange={(e) => setVals(v => ({ ...v, [key]: e.target.value }))} />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        {[['showGrid', 'Grid'], ['showLabels', 'Labels']].map(([key, label]) => (
          <label key={key} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={(vals as any)[key]}
              onChange={(e) => setVals(v => ({ ...v, [key]: e.target.checked }))} />
            {label}
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={apply} style={{ flex: 1, background: '#006c67', color: 'white', border: 'none', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
          Apply
        </button>
        <button onClick={onClose} style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 0', fontSize: 12, cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function GraphAxesComponent({ shape }: { shape: GraphAxesShape }) {
  const editor = useEditor();
  const isEditing = editor.getEditingShapeId() === shape.id;

  return (
    <HTMLContainer>
      <div style={{ position: 'relative', width: shape.props.w, height: shape.props.h, userSelect: 'none' }}>
        <GraphAxesSvg shape={shape} />
        {isEditing && (
          <GraphAxesEditor shape={shape} onClose={() => editor.setEditingShape(null)} />
        )}
      </div>
    </HTMLContainer>
  );
}

export class GraphAxesShapeUtil extends ShapeUtil<any> {
  static override type = 'graph-axes' as const;

  static override props = {
    w: T.number,
    h: T.number,
    xMin: T.number,
    xMax: T.number,
    yMin: T.number,
    yMax: T.number,
    showGrid: T.boolean,
    showLabels: T.boolean,
    gridColor: T.string,
    axisColor: T.string,
    labelColor: T.string,
    title: T.string,
    xLabel: T.string,
    yLabel: T.string,
  };

  override isAspectRatioLocked = () => false;
  override canResize = () => true;
  override canEdit = () => true;

  getDefaultProps(): GraphAxesShape['props'] {
    return {
      w: 320,
      h: 260,
      xMin: -5,
      xMax: 5,
      yMin: -5,
      yMax: 5,
      showGrid: true,
      showLabels: true,
      gridColor: '#e2e8f0',
      axisColor: '#1e293b',
      labelColor: '#475569',
      title: '',
      xLabel: 'x',
      yLabel: 'y',
    };
  }

  getGeometry(shape: GraphAxesShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: GraphAxesShape) {
    return <GraphAxesComponent shape={shape} />;
  }

  indicator(shape: GraphAxesShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
